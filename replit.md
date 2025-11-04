# My AI Agent - MVP

## Overview
This project is a full-stack AI chat application offering a real-time, voice-enabled conversational AI experience. It features AI vision for file uploads, robust user authentication, an administrative dashboard, and a sophisticated memory system for personalized interactions. A core innovation is the **UI-Aware AI Agent**, designed to understand and interact with the application's user interface, guiding users and executing UI actions. The project aims to deliver a highly interactive, intelligent, and user-friendly AI chat environment with strong personalization.

## User Preferences
Users can customize how the AI communicates with them through a comprehensive personalization system, including:
- **Response Style**: Casual, balanced, or professional communication
- **Response Length**: Brief, medium, or detailed responses
- **Tone**: Formal, friendly, or enthusiastic
- **Use Emojis**: Toggle emoji usage in responses
- **Creativity Level**: Conservative, balanced, or creative AI behavior
- **Explanation Depth**: Simple, medium, or technical explanations
- **Examples Preference**: Include or skip practical examples
- **Proactive Suggestions**: Enable/disable unsolicited helpful suggestions
- **Code Format**: Minimal, readable, or detailed code comments

These preferences are stored and automatically injected into AI system prompts for every conversation, ensuring the AI adapts its behavior to match user choices.

## System Architecture
The application employs a client-server architecture with React and Vite for the frontend (styled with TailwindCSS) and Node.js with Express for the backend. PostgreSQL serves as the primary database.

**Core Architectural Decisions & Features:**
-   **UI-Aware AI Agent**: Understands and interacts with the application's UI via a UI Schema Layer, Context Engine, LLM Orchestrator, and Action Execution Layer. It supports bidirectional event tracking and has code and user awareness for personalized guidance and actions.
-   **Authentication**: JWT-based with bcrypt hashing, HTTP-only cookies, and CSRF protection.
-   **User Profile Management**: Includes editing, picture uploads, phone validation, and enhanced password management.
-   **Chat Interface**: Supports streaming responses, multiple conversations, dynamic model selection, and intelligent automatic chat naming.
-   **Voice Chat**: Real-time communication using WebSockets and OpenAI's Realtime API.
-   **File Upload**: Supports various file types with integrated AI vision.
-   **Memory System**: AI extracts and stores user-specific facts for personalization and proactive use.
-   **Project Management Integration**: Built-in task management powered by Planka's open-source system with AI-driven task creation and management:
    - **Per-User Isolation**: Each user gets a dedicated Planka project/board with isolated To Do, In Progress, and Done lists
    - **AI Task Creation**: AI can create tasks/cards directly from conversations with function calling
    - **Subtask Support**: Hierarchical task organization with subtask creation and tracking
    - **Conversation Linking**: Tasks automatically linked to the conversation where they were created
    - **Multi-Tenant Security**: Complete isolation with authorization checks at all levels (cards, tasks, conversations)
    - **REST API**: Full CRUD operations via `/api/planka/*` endpoints with proper 403 error handling
-   **Admin Dashboard**: Provides user management, API usage statistics, and comprehensive API key management.
-   **Security**: Implements Helmet, CORS, encrypted storage for API secrets, and secure password verification.
-   **Intelligent Model Selection**: Dynamically selects optimal Gemini models based on query complexity.
-   **Streaming Function Calling**: Enables AI to execute UI actions during streaming conversations.
-   **Web Search Capability**: Dual search system with both manual and automatic grounding:
    - **Manual Search**: Google Custom Search API via dedicated search button
    - **Vertex AI Grounding**: Native Google Search integration that automatically triggers for real-time queries (news, current events, prices, scores, etc.)
-   **Google Services Integration**: Complete suite of Google services via custom OAuth 2.0 with per-user tokens, including Gmail, Calendar, Drive, Docs, and Sheets.
-   **Performance Optimizations**: Includes database indexing, query consolidation, connection pooling, asynchronous operations, frontend code splitting, and React Query.
-   **Self-Awareness & Intelligence**: Features enhanced memory, per-conversation analytics, and feedback-driven model improvements.

**UI/UX Decisions**:
-   "Auto 🤖" mode for intelligent model selection.
-   Visual distinction of API keys in the admin dashboard.
-   Toast notifications for user actions.
-   Hover-based message controls.
-   Memory counter in the sidebar and toggleable conversation insights panel.

## External Dependencies
-   **Google Gemini API**: Primary AI model for chat, vision, and text generation.
-   **Google Vertex AI**: For advanced features including native Google Search grounding with Gemini 2.0 models (with automatic fallback to Gemini API if credentials unavailable).
-   **Google Cloud TTS/STT**: Text-to-Speech (1,886 voices) and Speech-to-Speech capabilities.
-   **PostgreSQL**: Primary database.
-   **Google Custom Search API**: For manual web search functionality.
-   **Google OAuth 2.0**: For integration with Google services (Gmail, Calendar, Drive, Docs, Sheets).

## Recent Updates (November 2025)
-   **Vertex AI Fallback**: Added automatic fallback to standard Gemini API when Vertex AI credentials are unavailable, ensuring AI functionality remains operational.
-   **Settings Dropdown Menu**: Replaced direct profile navigation with a hover-activated dropdown menu on the settings icon, providing quick access to Profile, Project Management, and Planka UI pages.
-   **Project Management Page**: Created dedicated page for viewing and managing tasks with kanban-style board (To Do, In Progress, Done lists).
-   **Task Management UI**: Full CRUD interface for tasks including create, edit, delete, and move between lists with real-time updates.
-   **Full Planka Integration**: Deployed complete standalone Planka server on port 3002 with SSL-enabled Neon PostgreSQL connection, providing access to the full-featured project management UI alongside the custom integration.

## Search & Grounding Architecture
The application implements a sophisticated dual-search system:

1. **Manual Search** (Google Custom Search API):
   - Triggered via dedicated Globe button in chat interface
   - Displays formatted results with rankings, thumbnails, and "Open All" functionality
   - Suitable for explicit search requests

2. **Automatic Grounding** (Vertex AI + Native Google Search):
   - Automatically detects queries needing real-time information
   - Keywords trigger automatic search: "latest", "current", "today", "news", "recent", "who won", "price", "weather", "score", etc.
   - Gemini 2.0 models seamlessly ground responses with web data
   - No separate results display - information integrated into AI response
   - Requires Vertex AI service account credentials