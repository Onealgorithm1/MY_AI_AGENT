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
-   **Admin Dashboard**: Provides user management, API usage statistics, and comprehensive API key management.
-   **Security**: Implements Helmet, CORS, encrypted storage for API secrets, and secure password verification.
-   **Intelligent Model Selection**: Dynamically selects optimal OpenAI models based on query complexity.
-   **Streaming Function Calling**: Enables AI to execute UI actions during streaming conversations.
-   **Web Search Capability**: AI can perform web searches using Google Custom Search, displaying results with citations.
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
-   **OpenAI API**: Used for GPT-4o (chat, vision), Realtime API (voice), Whisper (speech-to-text), and TTS (text-to-speech).
-   **ElevenLabs API**: (Optional) For premium Text-to-Speech.
-   **PostgreSQL**: Primary database.
-   **Google Custom Search API**: For web search functionality.
-   **Google OAuth 2.0**: For integration with Google services (Gmail, Calendar, Drive, Docs, Sheets).