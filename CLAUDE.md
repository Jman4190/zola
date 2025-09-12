# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Testing

This project doesn't have explicit test scripts configured. Check with the user for testing approach.

## Architecture

This is a Next.js 15 application called "Houzz" (formerly Zola) - an AI chat interface supporting multiple models and providers.

### Key Directories

- `/app` - Next.js App Router pages and components
- `/lib` - Core business logic, utilities, and stores
- `/components` - Reusable UI components organized by:
  - `ui/` - shadcn/ui components
  - `prompt-kit/` - AI-specific components
  - `common/` - General shared components
  - `icons/` - Custom icon components

### Core Architecture Patterns

- **State Management**: Multiple Zustand stores for different concerns:

  - `lib/user-store/` - User authentication and profile
  - `lib/chat-store/` - Chat sessions, messages, and history
  - `lib/model-store/` - AI model configuration and selection
  - `lib/user-preference-store/` - User settings and preferences

- **Provider Pattern**: Heavy use of React Context providers for state management, all initialized in `app/layout.tsx`:

  - UserProvider, ModelProvider, ChatsProvider, ChatSessionProvider, UserPreferencesProvider

- **Database**: Supabase for authentication, storage, and data persistence
- **AI Integration**: Vercel AI SDK with support for multiple providers (OpenAI, Gemini, etc)

### Key Configuration

- AI models and limits configured in `lib/config.ts`
- System prompt and app constants in same file
- Environment variables for API keys and Supabase config required
- BYOK (Bring Your Own Key) support with encryption in `lib/user-keys.ts`

### Tech Stack

- Next.js 15 with App Router
- TypeScript with strict configuration
- Tailwind CSS + shadcn/ui components
- Supabase (auth, database, storage)
- Vercel AI SDK for multi-model support
- Zustand for state management
- TanStack Query for data fetching

### Development Notes

- Uses absolute imports with `@/*` path mapping
- Prettier configured with import sorting and Tailwind class sorting
- ESLint ignoring builds in development (see next.config.ts)
- Supports both cloud AI providers and local Ollama models
- File uploads and attachments supported via Supabase storage
