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

## External Dependencies
- **OpenAI API**: Utilized for GPT-4o (main chat, vision), Realtime API (voice), Whisper (speech-to-text), and TTS (text-to-speech).
- **ElevenLabs API**: (Optional) For premium Text-to-Speech capabilities.
- **PostgreSQL**: Used as the primary database for data persistence.