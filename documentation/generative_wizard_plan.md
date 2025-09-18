# Agentic Project Wizard — Build Plan (with Supabase + Vercel AI SDK)

This plan turns your “opportunistic wizard” into a production path: reuse great questions from a bank, generate new ones when needed, and store everything cleanly in Supabase. It also covers creating the four CSV-backed tables in production, then adding the agentic layers (vectors, candidates, asks/answers), wiring to Vercel AI SDK, and a step-by-step test/debug path.

---

## 0) Objectives

- Let the agent **create/update** projects via conversation.
- **Reuse** relevant questions; **generate** new ones on the fly when gaps appear.
- Persist **asks/answers**, **preferences**, and **project details** (JSONB).
- Keep a **small ontology** of canonical attributes so the agent stays coherent.
- Make it easy to **promote** successful generated questions into the curated bank.

---

## 1) High-Level Architecture

```
[Chat (Vercel AI SDK)]
   └─ agent calls tools → [Question Orchestrator]
            ├─ retrieve similar questions (pgvector)
            ├─ compute unknowns (ontology + project schema)
            ├─ rank for info gain vs. friction
            └─ generate new question if needed (quality gates)
   ← ask next question ──┘
         ↑                         ↓
      user answer           store ask/answer → update project JSONB
```

---

## 2) Supabase: Extensions & Conventions

```sql
-- One time
create extension if not exists pgcrypto;   -- gen_random_uuid
create extension if not exists vector;     -- pgvector (HNSW)
```

- **IDs**: `uuid default gen_random_uuid()`.
- **Timestamps**: `timestamptz default now()`.
- **RLS**: enable on user-owned tables; sample policies below.
- **JSONB**: project “details” remains the flexible sink for structured attributes.

---

## 3) Create the CSV-Backed Core Tables

These mirror your CSVs so you can import them directly.

### 3.1 `project_types`

```sql
create table if not exists project_types (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 `question_sets`

```sql
create table if not exists question_sets (
  id uuid primary key,
  project_type_id uuid references project_types(id) on delete set null,
  version int not null default 1,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_qsets_ptype on question_sets(project_type_id);
```

### 3.3 `questions`

```sql
create table if not exists questions (
  id uuid primary key,
  question_set_id uuid references question_sets(id) on delete set null,
  key text,                              -- canonical key when known (e.g. "room", "budget")
  prompt text not null,                  -- question text
  help_text text,
  type text,                             -- legacy/type (kept for compatibility)
  ui_type text not null,                 -- e.g., single_select, multi_select, text, number, photo
  required boolean not null default false,
  placeholder text,
  min_selections int,
  max_selections int,
  is_terminal boolean not null default false,
  sort_order int not null default 0,
  ui_props jsonb not null default '{}'::jsonb,
  validation jsonb,
  conditional jsonb,                     -- show/hide rules
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- agentic fields (empty for now; filled later)
  is_generated boolean not null default false,
  attribute_keys text[] not null default '{}',
  text_embedding vector(1536)
);
create index if not exists idx_questions_set on questions(question_set_id);
create index if not exists idx_questions_attr on questions using gin(attribute_keys);
create index if not exists idx_questions_hnsw on questions using hnsw (text_embedding vector_cosine_ops);
```

### 3.4 `question_options`

```sql
create table if not exists question_options (
  id uuid primary key,
  question_id uuid not null references questions(id) on delete cascade,
  value text not null,                   -- canonical value
  label text,                            -- UI label
  description text,
  image_url text,
  details jsonb,                         -- any extra metadata
  sort_order int not null default 0,
  is_active boolean not null default true
);
create index if not exists idx_qopts_qid on question_options(question_id);
```

> **Importing CSVs**: Use Supabase Table Editor → “Import data” for each table or run `\copy` via psql. If your CSV IDs are UUIDs (they are), they’ll insert cleanly.

---

## 4) Project Spine (if not already created)

```sql
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,                 -- add RLS to restrict by owner
  title text not null,
  status text not null default 'draft',
  project_type text not null default 'custom',
  details jsonb not null default '{}'::jsonb,
  details_schema_version int not null default 1,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- optional generated columns for common filters
alter table projects
  add column if not exists budget numeric generated always as ((details->>'budget')::numeric) stored,
  add column if not exists zipcode text generated always as (details->>'zipcode') stored;

create index if not exists idx_projects_details on projects using gin(details jsonb_path_ops);
create index if not exists idx_projects_budget on projects(budget);
create index if not exists idx_projects_zip on projects(zipcode);

-- optimistic locking
create or replace function bump_project_version()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;
drop trigger if exists trg_projects_bump on projects;
create trigger trg_projects_bump before update on projects
for each row execute function bump_project_version();
```

---

## 5) Agentic Wizard Tables (new)

These power retrieval, generation, asks/answers, and promotion.

```sql
-- Canonical attribute ontology (small and extensible)
create table if not exists attribute_keys (
  key text primary key,              -- e.g., 'room', 'style.palette', 'budget', 'timeline.deadline'
  description text,
  answer_type text not null,         -- 'single_select'|'multi_select'|'number'|'text'|'photo'|'range'
  priority int not null default 0,
  is_personal_pref boolean not null default false
);

-- Embedding cache (you can also just use questions.text_embedding)
create table if not exists question_embeddings (
  question_id uuid primary key references questions(id) on delete cascade,
  text_embedding vector(1536) not null,
  attribute_keys text[] not null default '{}',
  project_type text,
  active boolean not null default true
);
create index if not exists idx_qemb_hnsw on question_embeddings using hnsw (text_embedding vector_cosine_ops);

-- Question performance
create table if not exists question_stats (
  question_id uuid primary key references questions(id) on delete cascade,
  shown_count int not null default 0,
  answered_count int not null default 0,
  avg_time_to_answer interval,
  helpful_votes int not null default 0
);

-- Proposed (LLM or analyst-authored) questions awaiting promotion
create table if not exists question_candidates (
  id uuid primary key default gen_random_uuid(),
  canonical_key text,                   -- maps to attribute_keys.key (nullable if exploratory)
  text text not null,
  ui_type text not null,
  options jsonb not null default '[]',
  rationale jsonb not null default '{}'::jsonb,
  source text not null default 'llm',   -- 'llm'|'analyst'|'import'
  status text not null default 'proposed'  -- 'proposed'|'approved'|'rejected'
);

-- What we asked in a project
create table if not exists question_asks (
  id bigserial primary key,
  project_id uuid not null references projects(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  candidate_id uuid references question_candidates(id) on delete set null,
  asked_text text not null,
  attribute_keys text[] not null default '{}',
  asked_at timestamptz not null default now()
);
create index if not exists idx_qasks_proj on question_asks(project_id);

-- The answer payload we received
create table if not exists question_answers (
  ask_id bigint primary key references question_asks(id) on delete cascade,
  raw_answer jsonb not null,          -- UI payload
  parsed jsonb,                       -- normalized {key: value}
  answered_at timestamptz not null default now()
);

-- Normalized, current answers per project (fast read; mirrors into projects.details)
create table if not exists project_answers (
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  value jsonb not null,
  source text not null,               -- 'user'|'agent'|'inferred'|'image'
  confidence real not null default 0.7,
  updated_at timestamptz not null default now(),
  primary key (project_id, key)
);

-- Keep details in sync with the normalized cache
create or replace function sync_details_from_answers()
returns trigger language plpgsql as $$
declare merged jsonb;
begin
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  into merged
  from project_answers where project_id = coalesce(new.project_id, old.project_id);

  update projects set details = merged, updated_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return null;
end $$;

drop trigger if exists trg_answers_to_details_ins on project_answers;
drop trigger if exists trg_answers_to_details_upd on project_answers;
drop trigger if exists trg_answers_to_details_del on project_answers;

create trigger trg_answers_to_details_ins
after insert on project_answers
for each row execute function sync_details_from_answers();

create trigger trg_answers_to_details_upd
after update on project_answers
for each row execute function sync_details_from_answers();

create trigger trg_answers_to_details_del
after delete on project_answers
for each row execute function sync_details_from_answers();
```

---

## 6) Matching RPC (vector search) & Candidate Promotion

### 6.1 Embedding match (RPC)

```sql
-- SQL function to return top matches from questions.text_embedding
create or replace function match_questions_by_embedding(
  query_embedding vector(1536),
  match_count int default 10,
  similarity_threshold float default 0.75
) returns table(
  question_id uuid,
  prompt text,
  attribute_keys text[],
  similarity float
) language sql stable as $$
  select q.id, q.prompt, q.attribute_keys,
         1 - (q.text_embedding <=> query_embedding) as similarity
  from questions q
  where q.text_embedding is not null
    and (1 - (q.text_embedding <=> query_embedding)) >= similarity_threshold
  order by q.text_embedding <=> query_embedding
  limit match_count;
$$;
```

### 6.2 Candidate → Question promotion

```sql
create or replace function promote_question_candidate(p_id uuid)
returns uuid language plpgsql as $$
declare q_id uuid;
begin
  insert into questions (prompt, ui_type, is_generated, attribute_keys)
    select text, ui_type, true,
           case when canonical_key is not null then array[canonical_key]::text[] else '{}'::text[] end
    from question_candidates
    where id = p_id and status = 'proposed'
    returning id into q_id;

  update question_candidates set status='approved' where id = p_id;
  return q_id;
end $$;
```

---

## 7) RLS (examples)

```sql
-- Example: projects owned by a user
alter table projects enable row level security;

create policy "own projects"
on projects for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Mirror policy on project_answers, question_asks, question_answers via project_id FK
alter table project_answers enable row level security;
create policy "own project answers" on project_answers
using (project_id in (select id from projects where owner_id = auth.uid()))
with check (project_id in (select id from projects where owner_id = auth.uid()));

alter table question_asks enable row level security;
create policy "own project asks" on question_asks
using (project_id in (select id from projects where owner_id = auth.uid()))
with check (project_id in (select id from projects where owner_id = auth.uid()));

alter table question_answers enable row level security;
create policy "own project answers2" on question_answers
using (ask_id in (select id from question_asks qa
                  join projects p on p.id = qa.project_id
                  where p.owner_id = auth.uid()))
with check (ask_id in (select id from question_asks qa
                  join projects p on p.id = qa.project_id
                  where p.owner_id = auth.uid()));
```

---

## 8) Vercel AI SDK Integration (Chat + Tools)

Use tools (function calls) to (a) pick next question and (b) submit answers.

### 8.1 Tool interfaces

```ts
// tools.ts
export type AskNextArgs = { projectId: string }
export type SubmitAnswerArgs = { askId: number; payload: any }

export const tools = {
  ask_next_question: {
    description: "Pick the next best question to ask",
    parameters: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
    },
  },
  submit_answer: {
    description: "Submit an answer to a previously asked question",
    parameters: {
      type: "object",
      properties: { askId: { type: "number" }, payload: { type: "object" } },
      required: ["askId", "payload"],
    },
  },
}
```

### 8.2 Route handler (Vercel AI SDK)

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai"
import { createClient } from "@supabase/supabase-js"
import { streamText, tool } from "ai"
import { tools } from "./tools"

export async function POST(req: Request) {
  const { messages, projectId } = await req.json()
  const supa = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  )

  const result = await streamText({
    model: openai("gpt-4o-mini"), // your choice
    messages,
    tools: {
      ask_next_question: tool({
        description: tools.ask_next_question.description,
        parameters: tools.ask_next_question.parameters,
        execute: async ({ projectId }) => {
          // call your orchestrator (edge function or local code)
          const data = await askNextQuestion(supa, projectId)
          return data // { ask_id, question: { text, ui_type, options? } }
        },
      }),
      submit_answer: tool({
        description: tools.submit_answer.description,
        parameters: tools.submit_answer.parameters,
        execute: async ({ askId, payload }) => {
          const data = await submitAnswer(supa, askId, payload)
          return data // normalization + project patching result
        },
      }),
    },
  })

  return result.toAIStreamResponse()
}
```

### 8.3 Orchestrator snippets

```ts
// orchestrator.ts
export async function askNextQuestion(supa, projectId: string) {
  // 1) Load state
  const { data: project } = await supa
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()
  const { data: answered } = await supa
    .from("project_answers")
    .select("key")
    .eq("project_id", projectId)
  const known = new Set(answered?.map((a) => a.key) ?? [])

  // 2) Build query embedding (e.g., last few turns + unknown keys)
  const queryText = buildQueryText(project, known)
  const queryEmbedding = await embedText(queryText)

  // 3) Vector match
  const { data: reuse } = await supa.rpc("match_questions_by_embedding", {
    query_embedding: queryEmbedding,
    match_count: 10,
    similarity_threshold: 0.78,
  })

  // 4) Required unknowns
  const requiredUnknowns = await computeUnknowns(project) // deterministic: ontology/schema

  // 5) Generate proposals for any required unknowns lacking a reuse candidate
  const generated = await maybeGenerate(requiredUnknowns, reuse)

  // 6) Rank and pick
  const picked = rankCandidates({ reuse, generated, known, project })
  const { data: asked } = await supa
    .from("question_asks")
    .insert({
      project_id: projectId,
      question_id: picked.question_id ?? null,
      candidate_id: picked.candidate_id ?? null,
      asked_text: picked.text,
      attribute_keys: picked.attribute_keys ?? [],
    })
    .select("id")
    .single()

  return {
    ask_id: asked!.id,
    question: {
      text: picked.text,
      ui_type: picked.ui_type,
      options: picked.options ?? [],
    },
  }
}

export async function submitAnswer(supa, askId: number, payload: any) {
  // 1) Save raw
  await supa
    .from("question_answers")
    .insert({ ask_id: askId, raw_answer: payload })

  // 2) Normalize via a small LLM call → { key, value, confidence }
  const normalized = await normalizeAnswerWithLLM(payload)

  // 3) Upsert normalized cache
  for (const { key, value, confidence, source } of normalized.items) {
    await supa.from("project_answers").upsert({
      project_id: normalized.projectId,
      key,
      value,
      confidence,
      source,
    })
  }

  // 4) Bump stats
  // ...increment question_stats.* for the linked question_id if present

  return { ok: true, normalized }
}
```

---

## 9) Seeding & Backfills

1. **Import CSVs** (Table Editor or `\copy`) for `project_types`, `question_sets`, `questions`, `question_options`.
2. **Attribute mapping**: add initial `attribute_keys` rows (e.g., `room`, `budget`, `style.styles`, `style.palette`, `deadline`).
3. **Backfill `questions.attribute_keys`** for curated questions (simple script mapping by `key`).
4. **Embed** question prompts and update `questions.text_embedding`.

   - Node script (batch with retries), then:

```sql
update questions
set text_embedding = $1  -- bind parameter per row
where id = $2;
```

5. (Optional) also populate `question_embeddings` if you prefer a separate cache.

---

## 10) “Next Question” Policy

**Score =**
`w1 * information_gain + w2 * priority - w3 * friction + w4 * reuse_boost - w5 * recency_penalty`.

- `information_gain`: 1.0 when attribute unknown; 0.5 when known but low confidence or stale.
- `priority`: from `attribute_keys.priority`.
- `friction`: low for single_select; higher for free text/photo.
- `reuse_boost`: from `question_stats.answered_count / shown_count`.
- `recency_penalty`: if asked in last N turns/minutes.

Hard rules:

- If project type entropy is high → ask **1 disambiguation** question first.
- Avoid repeating anything asked in the last few turns or already high-confidence in `project_answers`.

---

## 11) HTTP Contracts (useful for tooling)

- `POST /api/projects/:id/ask-next` → `{ ask_id, question: { text, ui_type, options? } }`
- `POST /api/questions/:askId/answer` → `{ ok, normalized }`
- `PATCH /api/projects/:id` (optional) → applies JSON Patch or partial update
- `POST /api/questions/candidates/:id/promote` (admin only)

---

## 12) Testing Plan (step-by-step)

### 12.1 Database & Data

1. **Migrations**: apply SQL in a clean schema; verify tables exist.
2. **CSV import**: import four CSVs; verify counts with `select count(*)`.
3. **RLS sanity**: with anon key, attempt read/write and confirm denial; with the user session, confirm allowed rows.
4. **Embeddings**: run the backfill script on a small subset; test `match_questions_by_embedding` with a known query phrase.

### 12.2 Orchestrator

1. **Unit tests (Node)**:

   - `computeUnknowns(project)` with various `details`.
   - `rankCandidates` with synthetic candidates.
   - `normalizeAnswerWithLLM` on representative payloads (also add deterministic fallbacks).

2. **Integration tests**:

   - Start a dummy project; call `ask-next` repeatedly; ensure no repeats, requireds get satisfied, and `project_answers` updates mirror into `projects.details`.
   - Submit photo answers (if applicable) → ensure parser either stores path or creates a follow-up confirmation.

3. **E2E (Playwright)**:

   - Drive the web chat, verify streamed messages, tool calls, and UI renders for single/multi-select questions.

### 12.3 Observability & Debug

- **Logs**: log every tool call input/output (redact PII), ask/answer IDs, and model choice.
- **DB traces**: sample slow queries on `questions` HNSW search; adjust `match_count` and threshold.
- **Feature flags**:

  - `wizard_generation_enabled`
  - `auto_promote_candidates_when_success_rate_gt_X`

- **Dashboards**:

  - Daily `shown_count`, `answered_count`, `drop_rate` by attribute.
  - Top generated questions and their conversion.

---

## 13) Rollout Plan

1. **Phase 0**: read-only preview of `ask-next` in a dev project; no generation.
2. **Phase 1**: enable generation but **log-only**; human review & manual promotion.
3. **Phase 2**: auto-promote when a candidate hits N uses and ≥ Y% answer rate.
4. **Phase 3**: add personalization (reuse `user_preferences`; prefill confirmations).

---

## 14) Helpful Queries & Policies

**Containment query**:

```sql
select id, title from projects where details @> '{"room":"bedroom"}';
```

**Recent asks for a project**:

```sql
select qa.id, qa.asked_text, qa.asked_at
from question_asks qa
where qa.project_id = '...'
order by qa.asked_at desc limit 10;
```

**Update stats after an answer** (run in your answer handler):

```sql
update question_stats
set shown_count = shown_count + 0, answered_count = answered_count + 1
where question_id = (select question_id from question_asks where id = $1 and question_id is not null);
```

---

## 15) Where the LLM fits (minimal, reliable)

- **Select-next**: retrieve (vectors) → rank (code). LLM **only** when:

  - a required attribute lacks a good reusable question, or
  - user intent is clearly off-ontology and a clarifying question is needed.

- **Canonicalization**: generated question → `(canonical_key, ui_type, options)` via a small schema-constrained call.
- **Normalization**: raw answer payload → `{ key, value, confidence }`.

All outputs go through **guards** (supported UI types, duplicate check via embeddings, PII filters).

---
