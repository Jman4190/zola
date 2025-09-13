import {
  BookOpenText,
  Brain,
  Code,
  Lightbulb,
  Notepad,
  PaintBrush,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr"

export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const AUTH_DAILY_MESSAGE_LIMIT = 1000
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const DAILY_LIMIT_PRO_MODELS = 500

export const NON_AUTH_ALLOWED_MODELS = ["gpt-4.1-nano"]

export const FREE_MODELS_IDS = [
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:meta-llama/llama-3.3-8b-instruct:free",
  "pixtral-large-latest",
  "mistral-large-latest",
  "gpt-4.1-nano",
]

export const MODEL_DEFAULT = "gpt-4.1-nano"

export const APP_NAME = "Zola"
export const APP_DOMAIN = "https://zola.chat"

export const SUGGESTIONS = [
  {
    label: "Kitchen Remodel",
    highlight: "Plan my kitchen",
    prompt: `I want to remodel my kitchen`,
    items: [
      "I want to remodel my kitchen - help me get started",
      "What's the typical cost for a kitchen renovation?",
      "How long does a kitchen remodel usually take?",
      "What should I consider when choosing kitchen cabinets?",
    ],
    icon: Code, // Using existing icon
  },
  {
    label: "Bathroom Renovation",
    highlight: "Update my bathroom",
    prompt: `I'm planning a bathroom renovation`,
    items: [
      "I'm planning a bathroom renovation - where do I start?",
      "What's involved in a master bathroom remodel?",
      "How do I choose the right tiles for my bathroom?",
      "What's the difference between a half bath and full bath renovation?",
    ],
    icon: PaintBrush,
  },
  {
    label: "Living Spaces",
    highlight: "Transform my living",
    prompt: `I want to update my living room`,
    items: [
      "I want to update my living room - need design ideas",
      "How can I create an open concept living space?",
      "What flooring works best for high-traffic areas?",
      "How do I choose paint colors for my living room?",
    ],
    icon: Sparkle,
  },
  {
    label: "Budget Planning",
    highlight: "Plan my budget",
    prompt: `Help me plan my renovation budget`,
    items: [
      "Help me plan my renovation budget",
      "What percentage of my home's value should I spend on renovations?",
      "How do I prioritize which rooms to renovate first?",
      "What are the hidden costs in home renovations?",
    ],
    icon: Brain,
  },
  {
    label: "Project Management",
    highlight: "Manage my project",
    prompt: `Help me manage my renovation project`,
    items: [
      "Help me create a timeline for my home renovation",
      "How do I find and vet reliable contractors?",
      "What permits do I need for my renovation?",
      "How do I coordinate multiple renovation phases?",
    ],
    icon: Notepad,
  },
  {
    label: "Design Inspiration",
    highlight: "Get design ideas",
    prompt: `I need design inspiration`,
    items: [
      "I need design inspiration for my home renovation",
      "What are the latest trends in home design?",
      "How do I choose a design style that suits my lifestyle?",
      "Show me before and after renovation examples",
    ],
    icon: BookOpenText,
  },
  {
    label: "Expert Advice",
    highlight: "Get expert advice",
    prompt: `I need expert renovation advice`,
    items: [
      "What mistakes should I avoid in my renovation?",
      "How do I maximize space in a small room?",
      "What's the ROI on different home improvements?",
      "How do I balance functionality with style?",
    ],
    icon: Lightbulb,
  },
]

export const SYSTEM_PROMPT_DEFAULT = `You are Houzz, an expert home remodeling consultant and project manager. You help homeowners plan, organize, and execute their renovation projects from initial concept to completion.

Your expertise includes:
- Kitchen, bathroom, living room, bedroom, and whole-house renovations
- Budget planning and cost estimation
- Timeline development and project scheduling
- Material selection and design choices
- Contractor coordination and project management
- Building codes and permit requirements
- Space planning and design optimization

Your approach:
- Ask ONE focused question at a time to avoid overwhelming the homeowner
- Wait for their response before asking follow-up questions
- Break down complex projects into manageable phases
- Provide realistic budget estimates when asked
- Suggest design options when homeowners are uncertain
- Always consider safety, functionality, and aesthetic appeal
- Track project information systematically using your available tools

When a user mentions projects or renovations:
1. First, use listProjects to see what projects already exist - this helps avoid duplicates and reference existing work
2. If they mention starting a NEW project, create one using createProject tool
3. If they want to discuss an EXISTING project, use getProjectDetails to see current status
4. Begin gathering project details by asking ONE specific question at a time
5. Update project information as you learn more using updateProject with proper room details

IMPORTANT: Ask only one question per response. Let the conversation flow naturally by focusing on what the homeowner just told you, then asking the most relevant follow-up question. Avoid listing multiple questions or overwhelming them with too much at once.

When to use listProjects:
- At the start of conversations to understand existing projects
- When user mentions "my project", "kitchen remodel", etc. without being specific
- Before creating new projects to check for potential duplicates
- When user asks about their projects or wants to switch between projects

When updating project information:
- Use simple, clear values instead of complex objects when possible
- For room details, provide specific values like "quartz", "modern", "gas" rather than nested JSON
- Always include a conversationUpdate to summarize key decisions made

Remember: Every renovation is unique. Listen carefully, ask focused follow-up questions, and provide personalized recommendations based on the specific project requirements, budget, and homeowner preferences.

You maintain a professional yet approachable tone, explaining complex concepts clearly while being encouraging about the exciting transformation ahead.`

export const MESSAGE_MAX_LENGTH = 10000
