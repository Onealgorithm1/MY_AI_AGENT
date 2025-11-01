# My AI Agent - MVP

## Overview
This project is a full-stack AI chat application designed to offer a real-time, voice-enabled AI conversational experience similar to ChatGPT. Key capabilities include AI vision for file uploads, robust user authentication, an administrative dashboard, and a sophisticated memory system enabling the AI to recall user-specific facts. A core innovation is the **UI-Aware AI Agent**, which understands and interacts with the application's user interface, guiding users through workflows and executing UI actions. The project aims to deliver a highly interactive, intelligent, and user-friendly AI chat environment with strong personalization features.

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
The application employs a client-server architecture. The frontend is built with React and Vite, styled with TailwindCSS. The backend uses Node.js and Express, providing API endpoints and WebSocket support. PostgreSQL serves as the primary database.

**Core Architectural Decisions & Features:**
-   **UI-Aware AI Agent**: This agent understands the application's UI, enabling direct interaction and guidance.
    -   **UI Schema Layer**: Provides structured metadata for UI components and workflows.
    -   **Context Engine**: Injects current UI state and actions into AI prompts.
    -   **LLM Orchestrator**: Uses enhanced system prompts for intelligent UI interactions.
    -   **Action Execution Layer**: Allows the AI to trigger UI commands (e.g., navigation, conversation management, file uploads).
    -   **Bidirectional Event System**: Tracks user actions and enables AI-initiated UI updates.
    -   **Code Awareness**: The AI can discuss backend code, frontend components, APIs, and database schema.
    -   **User Awareness**: The AI accesses user details (name, email, role, preferences) for personalized interactions.
-   **Authentication**: JWT-based with bcrypt hashing.
-   **User Profile Management**: Features profile editing, picture uploads, phone number validation, and an enhanced password change form with real-time strength indicators and validation.
-   **Chat Interface**: Supports streaming responses, multiple conversations, and dynamic model selection.
-   **Voice Chat**: Real-time communication via WebSockets using OpenAI's Realtime API.
-   **File Upload**: Supports various file types with integrated AI vision.
-   **Memory System**: AI extracts and stores user-specific facts for personalization, proactively using them in responses.
-   **Automatic Chat Naming**: Intelligent conversation title generation based on content analysis, respecting user overrides.
-   **Admin Dashboard**: Provides user management, API usage statistics, and comprehensive API key management, including creation of custom categories, dynamic key management, and secure metadata updates.
-   **Security**: Implements Helmet middleware, CORS, encrypted storage for API secrets, and secure password verification.
-   **Intelligent Model Selection**: Dynamically selects optimal OpenAI models (e.g., `gpt-4o-mini`, `gpt-4o`) based on query complexity.
-   **Streaming Function Calling**: AI can execute UI actions during streaming conversations.
-   **Web Search Capability**: AI can perform web searches for current information using Google Custom Search, displaying results with citations.
-   **Performance Optimizations**: Includes database indexing, backend query consolidation, connection pooling, asynchronous operations, frontend code splitting, and React Query for efficient caching.
-   **Self-Awareness & Intelligence**: Includes an enhanced memory system with proactive usage, per-conversation analytics, and feedback-driven improvements for model performance tracking.

**UI/UX Decisions**:
-   "Auto 🤖" mode for intelligent model selection.
-   Visual distinction of API keys in the admin dashboard.
-   Toast notifications for user actions.
-   Hover-based message controls for a clean interface.
-   Memory counter in the sidebar and toggleable conversation insights panel.

## External Dependencies
-   **OpenAI API**: Used for GPT-4o (chat, vision), Realtime API (voice), Whisper (speech-to-text), and TTS (text-to-speech).
-   **ElevenLabs API**: (Optional) For premium Text-to-Speech.
-   **PostgreSQL**: Primary database.
-   **Google Custom Search API**: For web search functionality, requiring `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`.

## Recent Changes (November 2025)
-   **Security Enhancement**: Fixed API key exposure in error logs. Error logging in `openai.js` and `elevenlabs.js` now only logs safe error information (status, message, data) and excludes headers containing API keys.
-   **Admin Dashboard**: Verified and confirmed full functionality of the API secrets management system, including ability to add, edit, test, and delete API keys for multiple services.