# My AI Agent - MVP

## Overview
This project is a full-stack AI chat application, similar to ChatGPT, designed with a modern React frontend and a Node.js/Express backend. Its core purpose is to provide a real-time, voice-enabled AI conversational experience. Key capabilities include AI vision for file uploads, user authentication, an admin dashboard, and a sophisticated memory system that allows the AI to remember user-specific facts. A standout feature is the **UI-Aware AI Agent**, which understands the application's interface and can guide users through workflows and even execute UI actions directly. The project aims to offer a highly interactive, intelligent, and user-friendly AI chat environment.

## User Preferences
Not yet configured - will be updated as preferences are learned.

## System Architecture

The application follows a client-server architecture:
- **Frontend**: Built with React and Vite, utilizing TailwindCSS for styling.
- **Backend**: Developed with Node.js and Express, providing API endpoints and WebSocket support for real-time features.
- **Database**: PostgreSQL for data persistence.

**UI-Aware AI Agent System**: This intelligent agent is central to the application's design, enabling the AI to interact directly with the user interface.
- **UI Schema Layer**: Provides structured metadata for all UI components, pages, and workflows, allowing the AI to understand the interface layout and capabilities.
- **Context Engine**: Injects current UI state and available actions into AI prompts, ensuring the AI is always aware of the user's context.
- **LLM Orchestrator**: Uses enhanced system prompts to leverage the AI's UI awareness for more intelligent interactions.
- **Action Execution Layer**: Enables the AI to trigger specific UI commands via dedicated API endpoints. This includes actions like changing models, navigation, conversation management (create, switch, delete, pin, rename), file uploads, starting voice chats, and providing feedback.
- **Bidirectional Event System**: Tracks user actions on the frontend and allows the AI to initiate real-time UI updates, creating a highly responsive and interactive experience.

**Technical Implementations & Features**:
- **Authentication**: JWT-based authentication with bcrypt hashing.
- **Chat Interface**: Supports streaming responses, multiple conversations, and dynamic model selection.
- **Voice Chat**: Real-time voice communication via WebSockets using OpenAI's Realtime API.
- **File Upload**: Supports various file types (images, PDFs) with integrated AI vision capabilities.
- **Memory System**: AI automatically extracts and stores facts about users to personalize interactions.
- **Admin Dashboard**: Provides tools for user management, API usage statistics, and system monitoring.
- **Security**: Implements Helmet middleware, CORS, and encrypted storage for API secrets.
- **Intelligent Model Selection**: The AI dynamically selects the optimal OpenAI model (e.g., `gpt-4o-mini`, `gpt-4o`, `o1-preview`) based on query complexity and task type for cost efficiency and performance.
- **Streaming Function Calling**: AI can execute UI actions in real-time during streaming conversations.

**UI/UX Decisions**:
- The application includes an "Auto 🤖" mode for model selection, which is the default, providing intelligent model switching.
- The admin dashboard visually distinguishes API keys by type (project/admin/other) and allows for setting default keys.
- User interactions and AI-triggered actions are confirmed with toast notifications.

## Performance Optimizations

The application has been comprehensively optimized for performance across all layers:

**Database Layer:**
- **Indexes**: 10+ targeted indexes on frequently queried columns (conversations, messages, memory_facts, error_logs, usage_tracking, API secrets, UI actions)
- **Composite Indexes**: Multi-column indexes for common query patterns (user_id + date, conversation_id + created_at)
- **Filtered Indexes**: Conditional indexes for boolean filters (approved=true, is_active=true) to reduce index size

**Backend Optimizations:**
- **Query Consolidation**: Admin stats endpoint consolidated from 8+ sequential queries to single CTE-based query (8x reduction in DB round-trips)
- **Connection Pooling**: Optimized PostgreSQL pool (25 max, 5 min connections, keepalive enabled, 30s query timeout)
- **Async Operations**: Image analysis runs asynchronously via setImmediate() to prevent blocking upload responses
- **Smart Logging**: Query logging only for slow queries (>1000ms) to reduce console noise
- **HTTP Caching**: Static endpoints (UI schema, secret definitions) use Cache-Control headers (5-10 min)

**Frontend Optimizations:**
- **Code Splitting**: Lazy loading for ChatPage and AdminPage using React.lazy() reduces initial bundle size
- **React Query**: Optimized caching strategy (2min staleTime, 10min cacheTime, refetch on mount for freshness)
- **Performance Utilities**: Custom hooks for debounce, throttle, and memoization to prevent unnecessary re-renders

**Results:**
- Faster admin dashboard load times (single query vs 8+ queries)
- Improved upload responsiveness (async image analysis)
- Reduced initial page load (code splitting)
- Better data freshness (balanced React Query settings)
- Slower query detection for proactive optimization

## External Dependencies
- **OpenAI API**: Utilized for GPT-4o (main chat, vision), Realtime API (voice), Whisper (speech-to-text), and TTS (text-to-speech).
- **ElevenLabs API**: (Optional) For premium Text-to-Speech capabilities.
- **PostgreSQL**: Used as the primary database for data persistence.