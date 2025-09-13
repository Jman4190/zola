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

This is a Next.js 15 application called "Houzz" (formerly Zola) - a specialized **Home Remodeling Agent** that serves as an expert consultant for home renovation projects. The application combines AI chat capabilities with comprehensive project management features.

## Home Remodeling Agent Features

This application is specifically designed for home renovation project management:

- **Expert AI Consultant**: The agent is positioned as a professional remodeling consultant
- **Project Management**: Full CRUD operations for renovation projects with template support
- **Multi-Project Support**: Users can manage multiple renovation projects simultaneously
- **Progress Tracking**: Completion percentages and missing information detection
- **Room-Specific Details**: Different data structures for kitchen, bathroom, living room, etc.
- **Template-Based Creation**: 6 project types (kitchen, bathroom, living room, bedroom, whole house, outdoor)

### Key Directories

- `/app` - Next.js App Router pages and components
  - `projects/` - Projects overview page
  - `project/[projectId]/` - Individual project dashboard
  - `api/projects/` - Project management APIs
  - `api/chat/tools/` - AI function tools for project management
- `/lib` - Core business logic, utilities, and stores
  - `project-schemas.ts` - TypeScript schemas for all project types
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
  - `projects` table with remodeling fields (budget, timeline, rooms JSONB)
  - `project_templates` table with 6 renovation categories
  - `chats` table with project relationships
- **AI Integration**: Vercel AI SDK with support for multiple providers (OpenAI, Gemini, etc)
  - AI function tools: createProject, updateProject, getProjectDetails
  - Home remodeling expert system prompt

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

## Home Remodeling Agent Implementation

### Key URLs
- `/projects` - Projects overview with stats and quick creation
- `/project/[id]` - Individual project dashboard with progress tracking
- `/` - Main chat interface with remodeling agent

### AI Function Tools
- **createProject**: Auto-creates projects when users mention renovations
- **updateProject**: Incrementally collects project information with "unknown" states
- **getProjectDetails**: Provides completion analysis and missing information alerts

### Project Types Supported
1. Kitchen Remodel - Layout, cabinets, countertops, appliances, etc.
2. Bathroom Renovation - Vanity, shower, bathtub, toilet, etc.
3. Living Room Makeover - Layout, flooring, lighting, fireplace, etc.
4. Master Bedroom Suite - Bedroom and bathroom combination
5. Whole House Renovation - Multiple rooms and comprehensive planning
6. Outdoor Living Space - Patio, deck, and garden areas

### Database Schema
- Projects have template-based room initialization
- Room details stored in JSONB with type-specific schemas
- Progress tracking calculated from completed vs total fields
- Multi-project support with individual completion tracking
