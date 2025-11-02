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
-   **Google Services Integration**: Complete suite of Google services via custom OAuth 2.0:
    -   **Gmail**: Read, send, search, archive, delete emails (admin-only for security)
    -   **Calendar**: List events, create events, delete events with timezone preservation
    -   **Drive**: List files, search files, share files, delete files with query injection protection
    -   **Docs**: Create documents, read documents, append content to documents
    -   **Sheets**: Create spreadsheets, read data, update cells, append rows
    -   All services use per-user OAuth tokens with automatic refresh and comprehensive error handling
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
-   **Google OAuth Integration Complete**: Implemented comprehensive Google OAuth 2.0 authentication system with support for both sign-in and account linking. Users can now:
    -   Sign up/log in directly with Google account
    -   Link existing email/password accounts to Google
    -   Disconnect Google accounts from Settings page
    -   Access Gmail, Calendar, Drive, Docs, Sheets, Analytics, and Ads through AI commands with per-user OAuth tokens
    -   Benefit from automatic token refresh (5 minutes before expiry)
    -   Secure token storage with AES-256-GCM encryption
    -   Multi-tenant architecture supporting unlimited users with separate Google accounts
-   **Database Schema Updates**: Added `oauth_tokens` table with encrypted token storage and updated `users` table with Google OAuth fields (google_id, profile_picture, phone_number)
-   **Security Architecture**:
    -   AES-256-GCM encryption for all OAuth tokens (access & refresh)
    -   CSRF protection via state parameter in OAuth flow
    -   Per-user token isolation (users can only access their own Google data)
    -   Automatic token refresh prevents expired credentials
    -   Admin-only Gmail routes maintained for security
-   **Google Services Expansion (November 2, 2025)**: 
    -   Added Calendar integration: List/create/delete events with proper timezone handling
    -   Added Drive integration: List/search/share/delete files with query injection protection
    -   Added Docs integration: Create/read/update documents with full text extraction
    -   Added Sheets integration: Create/read/update spreadsheets with cell operations
    -   Comprehensive error handling across all services with user-friendly messages
    -   Enhanced action keywords to trigger Google functions: calendar, drive, docs, sheets terms
    -   Updated UI awareness to expose all Google capabilities to the AI agent
-   **Gmail Service Overhaul**: Migrated from Replit Gmail connector to custom per-user OAuth implementation. Each user's Gmail operations now use their own authenticated Google account instead of shared service account.
-   **Gmail Integration Complete**: Full Gmail functionality added via custom OAuth. Admin users can read, send, search, archive, delete, and manage emails through natural language AI commands. Security hardened with admin-only access controls on both API routes (requireAdmin middleware) and function calling (context.user verification). Fixed privilege escalation vulnerability by using authenticated user context instead of spoofable userId parameter.
-   **Security Enhancement**: Fixed API key exposure in error logs. Error logging in `openai.js` and `elevenlabs.js` now only logs safe error information (status, message, data) and excludes headers containing API keys.
-   **Admin Dashboard**: Verified and confirmed full functionality of the API secrets management system, including ability to add, edit, test, and delete API keys for multiple services.
-   **API Key Management Enhancement**: Updated `getApiKey()` function to fall back to environment variables when no key is found in the database. The system now checks database first, then falls back to `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, etc. from environment secrets.
-   **Admin Access**: Fixed admin user role assignment - `admin@myaiagent.com` now has 'admin' role and can access Admin Dashboard (🛡️ shield icon in sidebar).
-   **OAuth Security Hardening (November 2, 2025)**:
    -   **Encryption Key Validation**: Server now validates ENCRYPTION_KEY on startup - must be exactly 64 hex characters, preventing silent failures
    -   **State Token HMAC Signing**: OAuth state tokens now use HMAC-SHA256 signatures to prevent forgery and replay attacks
    -   **State Token Expiration**: 10-minute window enforced with timestamp validation (rejects tokens in future or expired)
    -   **Token Refresh Error Handling**: Gracefully deletes invalid tokens and logs reconnection requirements instead of crashing
    -   **Google API Rate Limiting**: Exponential backoff retry logic (3 retries) for 429/403/5xx errors across all Google services
    -   **Comprehensive Error Messages**: User-friendly OAuth error display covering all failure scenarios (expired state, invalid signature, access denied, etc.)
    -   **Privacy Policy & Terms**: Added Google-compliant placeholder pages at `/privacy` and `/terms` for OAuth app publishing
    -   **Enhanced Logging**: Token refresh, revocation, and error operations now log detailed success/failure information
-   **Enhanced Action Detection for Google Services (November 2, 2025)**:
    -   **Expanded Natural Language Recognition**: Action detection now recognizes broader phrasing patterns including "see my", "view my", "tell me my", "what are my", "what is my", "access my", "display my", "pull up my", and "load my"
    -   **Keyword-Based Detection**: Added comprehensive Google service keywords (email, gmail, inbox, mail, calendar, event, drive, file, doc, sheet) that trigger function calling when mentioned
    -   **Smart Function Passing**: Functions are now passed to OpenAI when EITHER an action command is detected OR when user mentions Google services AND has Google access
    -   **Enhanced Debug Logging**: Improved diagnostic logging shows query analysis, Google mention detection, access status, and function count
    -   **Fixes Gmail Integration**: Resolved issue where queries like "what do you see in my gmail" weren't triggering Gmail functions due to overly strict action detection
-   **Comprehensive Documentation Package (November 2, 2025)**:
    -   Created `GMAIL_INTEGRATION_TECHNICAL_REPORT.md` - Complete technical architecture, OAuth flow, API reference, and debugging guide
    -   Created `CONSULTANT_PACKAGE_GMAIL_INTEGRATION.md` - Executive summary package with all diagnostic reports, priority actions, and testing procedures
    -   Includes full code locations, database queries, function schemas, and recommended solutions for current OpenAI 400 error