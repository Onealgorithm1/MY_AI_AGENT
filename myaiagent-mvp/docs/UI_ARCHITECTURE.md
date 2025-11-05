# My AI Agent - Frontend UI Architecture Documentation

**Last Updated**: November 5, 2025  
**Purpose**: Detailed UI documentation to enhance AI self-awareness and improve user assistance capabilities

---

## 📦 Technology Stack

- **Framework**: React 18 with Vite 5
- **Styling**: TailwindCSS 3 with custom theme configuration
- **State Management**: Zustand stores with persistence
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query (React Query) v5
- **Icons**: Lucide React
- **Notifications**: Sonner (toast library)
- **Audio**: Custom TTS/STT integration with word-by-word highlighting

---

## 🗂️ Directory Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── ConversationInsights.jsx      # Analytics panel for conversations
│   ├── GoogleConnection.jsx          # Google services connection UI
│   ├── GoogleSignInButton.jsx        # OAuth sign-in button
│   ├── MessageSpeakerButton.jsx      # Individual message TTS controls
│   ├── MessageWithAudio.jsx          # Message display with audio playback
│   ├── PreferencesPanel.jsx          # User personalization settings
│   ├── SearchingIndicator.jsx        # Loading state for web searches
│   ├── SearchResults.jsx             # Google search results display
│   ├── SelfImprovementDashboard.jsx  # AI research & improvement tracking
│   ├── VoiceSelector.jsx             # Voice selection dropdown
│   └── WordHighlighter.jsx           # Word-by-word audio highlighting
├── hooks/              # Custom React hooks
│   ├── useEventTracking.js     # Bidirectional UI event tracking
│   ├── useMessageAudio.js      # Audio playback management
│   ├── useSpeechToText.js      # Voice recording & transcription
│   ├── useTypewriter.js        # Streaming text animation
│   └── useUIActions.js         # Function calling UI automation
├── pages/              # Route-level page components
│   ├── AdminPage.jsx           # Admin dashboard (user mgmt, API keys, stats)
│   ├── ChatPage.jsx            # Main chat interface
│   ├── GoogleCallbackPage.jsx # OAuth callback handler
│   ├── LoginPage.jsx           # Authentication form
│   ├── PreferencesPage.jsx     # Standalone preferences page
│   ├── PrivacyPolicy.jsx       # Privacy policy
│   ├── SignupPage.jsx          # User registration
│   ├── TermsOfService.jsx      # Terms of service
│   └── UserProfilePage.jsx     # Profile management & settings
├── services/           # API & external services
│   ├── api.js          # Axios API client
│   ├── events.js       # UI event tracking service
│   └── uiActions.js    # Function calling handlers
├── store/              # Global state management (Zustand)
│   ├── authStore.js    # Authentication state
│   └── chatStore.js    # Chat & conversation state
├── styles/
│   └── globals.css     # Global styles & TailwindCSS imports
├── utils/              # Utility functions
│   ├── audioCache.js   # TTS audio caching
│   ├── performance.js  # Performance monitoring
│   └── wordTiming.js   # Word-level audio synchronization
├── App.jsx             # Root component with routing
└── main.jsx            # Application entry point
```

---

## 🎨 Design System & Styling

### TailwindCSS Custom Theme

**Color Palette (HSL-based)**:
```css
/* Defined in globals.css as CSS variables */
--background: 0 0% 100%           /* White background */
--foreground: 222.2 84% 4.9%      /* Near-black text */
--primary: 221.2 83.2% 53.3%      /* Blue accent */
--secondary: 210 40% 96.1%        /* Light gray */
--muted: 210 40% 96.1%            /* Muted backgrounds */
--accent: 210 40% 96.1%           /* Accent highlights */
--destructive: 0 84.2% 60.2%      /* Red for errors/delete */
--border: 214.3 31.8% 91.4%       /* Border color */
--ring: 221.2 83.2% 53.3%         /* Focus ring (blue) */
```

**Border Radius**:
- `rounded-lg`: 8px (var(--radius))
- `rounded-md`: 6px
- `rounded-sm`: 4px

**Custom Animations**:
```javascript
"pulse-slow": "2s cubic-bezier(0.4, 0, 0.6, 1) infinite"  // Gentle pulsing
"slide-in": "0.2s ease-out"                                 // Panel entrance
```

### Component Styling Patterns

**Buttons**:
```jsx
// Primary Button
className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary Button
className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
           transition-colors"

// Icon Button
className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
```

**Input Fields**:
```jsx
className="w-full px-3 py-2 border border-gray-300 rounded-lg 
           focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**Cards/Panels**:
```jsx
className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
```

---

## 🧩 Core Component Deep Dive

### ChatPage.jsx (Main Interface)

**Sub-Components & Sections**:

1. **Sidebar** (Left Panel - Conversation List):
   - New Chat Button (`Plus` icon)
   - Conversation List (scrollable)
   - Each conversation item:
     - Title (editable on click)
     - Message count badge
     - Context menu (Pin, Archive, Delete)
   - Bottom actions:
     - Memory counter (`Brain` icon + count)
     - User menu (Profile, Settings, Admin, Logout)

2. **Main Chat Area**:
   - Header:
     - Conversation title
     - Model selector dropdown
     - Insights toggle button (`BarChart3` icon)
   - Message List (scrollable):
     - User messages (right-aligned, blue background)
     - AI messages (left-aligned, gray background)
     - Message actions (hover to reveal):
       - Copy (`Copy` icon)
       - Thumbs up/down feedback
       - Text-to-speech (`Volume2` icon)
   - Conversation Insights Panel (toggleable sidebar):
     - Message statistics
     - Model usage
     - Memory facts extracted
     - Feedback ratings

3. **Message Input Area** (Bottom):
   - Web Search button (`Globe` icon) - triggers manual Google search
   - File attachment button (`Paperclip` icon)
   - Voice recording button (`Mic`/`MicOff` icon) - toggles STT
   - Text input field (grows with content)
   - Send button (`Send` icon)
   - Voice selector (TTS settings)

**Key State Variables**:
```javascript
inputMessage         // User's current message text
selectedModel        // Active AI model (gemini-2.5-flash, etc.)
isVoiceActive        // STT recording state
ttsEnabled           // TTS auto-play enabled/disabled
streamingContent     // Current streaming AI response
manualSearchResults  // Google search results
showInsights         // Insights panel visibility
```

---

### UserProfilePage.jsx

**Sections**:
1. **Profile Picture Upload**:
   - Drag-and-drop zone
   - Click to upload
   - Preview with delete option

2. **Personal Information**:
   - Full Name (editable)
   - Email (read-only)
   - Phone Number (with validation)

3. **Security**:
   - Change Password button → Modal with current/new password fields

4. **Preferences** (Personalization):
   - Response Style: Casual / Balanced / Professional
   - Response Length: Brief / Medium / Detailed
   - Tone: Formal / Friendly / Enthusiastic
   - Use Emojis: Toggle
   - Creativity Level: Conservative / Balanced / Creative
   - Explanation Depth: Simple / Medium / Technical
   - Include Examples: Toggle
   - Proactive Suggestions: Toggle
   - Code Format: Minimal / Readable / Detailed

---

### AdminPage.jsx (Admin Dashboard)

**Sections** (Role: admin only):

1. **Statistics Cards** (Top Row):
   - Total Users
   - Active Users (7 days)
   - Total Conversations
   - Total Messages

2. **Usage Charts**:
   - Messages Today
   - Tokens Consumed Today
   - Voice Minutes Used
   - Files Uploaded

3. **User Management Table**:
   - Columns: Name, Email, Role, Created, Last Login
   - Actions: Edit Role, Delete User

4. **API Key Management**:
   - Add New API Key button
   - List of configured keys:
     - Provider (OpenAI, Google, etc.)
     - Key preview (masked)
     - Set as Active toggle
     - Delete button

---

## 🔄 User Interaction Flows

### Flow 1: Sending a Message

```
User Action → Frontend State → Backend API → UI Update
─────────────────────────────────────────────────────────

1. User types in input field
   → inputMessage state updates (controlled input)

2. User clicks Send button (or presses Enter)
   → Validation: Check if message is not empty
   → setIsSending(true) in chatStore
   → UI: Disable input, show loading spinner

3. POST /api/conversations/:id/messages
   → Body: { content: inputMessage, model: selectedModel }
   → Headers include CSRF token

4. Backend establishes SSE connection
   → Frontend: EventSource opens streaming response
   → Chunks arrive: onmessage handler receives data

5. Each chunk updates streamingMessage in chatStore
   → Typewriter hook animates text display
   → UI: Shows streaming message in real-time

6. Stream completes
   → Add complete message to messages array
   → Clear streamingMessage
   → setIsSending(false)
   → Scroll to bottom (messagesEndRef)
   → Auto-generate conversation title (if first message)

7. Optional: TTS auto-play
   → If ttsAutoPlay enabled → Generate audio → Play
```

### Flow 2: Voice Recording (Speech-to-Text)

```
User Action → Frontend → Backend API → UI Update
─────────────────────────────────────────────────

1. User clicks Mic button
   → startRecording() from useSpeechToText hook
   → Request microphone permission
   → UI: Mic button turns red, shows recording animation

2. Frontend captures audio chunks
   → MediaRecorder API records audio
   → UI: Shows live recording indicator

3. User clicks Mic button again (stop)
   → stopRecording() stops MediaRecorder
   → Blob created from audio chunks
   → setIsProcessing(true)
   → UI: Shows "Processing..." indicator

4. POST /api/stt (Speech-to-Text)
   → Body: FormData with audio blob
   → Backend: Google Cloud STT processes audio

5. Response: { transcript: "user's spoken text" }
   → setInputMessage(transcript)
   → UI: Text appears in input field
   → setIsProcessing(false)
   → User can edit before sending
```

### Flow 3: Web Search (Manual)

```
User Action → Frontend → Backend API → UI Update
─────────────────────────────────────────────────

1. User types search query in input
   → User clicks Globe button (not Send)

2. Frontend validation
   → Check if inputMessage is not empty
   → setIsManualSearching(true)
   → UI: Shows SearchingIndicator component

3. POST /api/search
   → Body: { query: inputMessage }
   → Backend: Calls Google Custom Search API

4. Response: { results: [...], searchInfo: {...} }
   → setManualSearchResults(response.data)
   → UI: Renders SearchResults component
   → Shows ranked results with:
     - Title (clickable link)
     - Snippet (description)
     - Thumbnail image (if available)
     - "Open All" button

5. SearchResults component
   → Displays above message input
   → User can click individual links or "Open All"
   → Close button clears results
   → setIsManualSearching(false)
```

### Flow 4: Creating New Conversation

```
User Action → Frontend → Backend API → UI Update
─────────────────────────────────────────────────

1. User clicks "+ New Chat" button
   → UI: Clear current messages
   → setCurrentConversation(null)
   → setMessages([])

2. POST /api/conversations
   → Body: { title: "New Conversation", model: selectedModel }
   → Backend: Creates conversation record in DB

3. Response: { conversation: { id, title, ... } }
   → setCurrentConversation(conversation)
   → queryClient.invalidateQueries(['conversations'])
   → Sidebar: Conversation list refreshes
   → UI: New conversation appears at top of list
   → Focus shifts to message input
```

### Flow 5: Preferences Update

```
User Action → Frontend → Backend API → UI Update
─────────────────────────────────────────────────

1. User navigates to Preferences page or panel
   → GET /api/auth/preferences
   → Loads current preferences
   → UI: Form populated with current values

2. User changes a preference (e.g., Response Style)
   → Local state updates immediately (optimistic)
   → UI: Shows updated selection

3. User clicks Save or changes debounce triggers
   → PUT /api/auth/preferences
   → Body: { preferences: { response_style: "casual", ... } }
   → Backend: Updates user record, invalidates cache

4. Response: { preferences: {...} }
   → UI: Toast notification "Preferences updated"
   → Preferences apply to next AI response
```

---

## 🧠 State Management (Zustand Stores)

### authStore.js

**Purpose**: Global authentication & user state

**State**:
```javascript
{
  user: {                   // Current user object
    id,
    email,
    fullName,
    role,                   // 'user' | 'admin'
    profileImage,
    preferences,
    createdAt,
    lastLoginAt
  },
  isAuthenticated: boolean, // Login status
  isLoading: boolean,       // API operation in progress
  error: string | null      // Error message
}
```

**Actions**:
- `login(email, password)` - Authenticate user
- `signup(email, password, fullName)` - Register new user
- `logout()` - Clear session & HTTP-only cookie
- `refreshUser()` - Reload user data from backend
- `clearError()` - Reset error state

**Persistence**: 
- Uses Zustand persist middleware
- Stores `user` and `isAuthenticated` in localStorage
- Key: `auth-storage`

---

### chatStore.js

**Purpose**: Chat conversations & messages state

**State**:
```javascript
{
  conversations: [],        // All user conversations
  currentConversation: {    // Active conversation
    id,
    title,
    model,
    pinned,
    archived,
    messageCount,
    createdAt,
    updatedAt
  },
  messages: [],             // Messages in current conversation
  streamingMessage: string, // Real-time streaming content
  isSending: boolean,       // Message send in progress
  isLoading: boolean,       // Data fetch in progress
  error: string | null
}
```

**Actions**:
- `setConversations(conversations)` - Update conversation list
- `setCurrentConversation(conversation)` - Switch active chat
- `setMessages(messages)` - Replace messages array
- `addMessage(message)` - Append new message
- `updateMessage(id, updates)` - Modify existing message
- `removeMessage(id)` - Delete message
- `setStreamingMessage(content)` - Update streaming text
- `clearStreamingMessage()` - Reset streaming state
- `setIsSending(boolean)` - Toggle send state
- `clearChat()` - Reset all chat state

**No Persistence**: 
- Chat state is ephemeral
- Conversations/messages always fetched fresh from backend via React Query

---

## ♿ Accessibility & Responsiveness

### Accessibility Features

1. **Keyboard Navigation**:
   - Tab order follows logical flow
   - Input fields focusable
   - Buttons have visible focus rings (`focus:ring-2`)
   - Escape key closes modals/panels

2. **ARIA Attributes** (Examples):
   ```jsx
   <button aria-label="Send message" />
   <button aria-label="Start voice recording" aria-pressed={isRecording} />
   <div role="alert" aria-live="polite">{error}</div>
   ```

3. **Semantic HTML**:
   - `<button>` for interactive elements (not `<div>`)
   - `<nav>` for sidebar navigation
   - `<main>` for primary content
   - `<form>` for input submissions

4. **Focus Management**:
   - Auto-focus on message input after sending
   - Focus trap in modals
   - Skip navigation links (future enhancement)

### Responsive Design

**Breakpoints** (TailwindCSS defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First Approach**:

**ChatPage Layout**:
```jsx
// Desktop (lg+): Sidebar + Chat + Insights (3 columns)
<div className="flex h-screen">
  <aside className="w-64 hidden lg:block">Sidebar</aside>
  <main className="flex-1">Chat</main>
  <aside className={showInsights ? "w-80" : "hidden"}>Insights</aside>
</div>

// Mobile (<lg): Hamburger menu for sidebar
<div className="lg:hidden">
  <button onClick={toggleSidebar}>☰ Menu</button>
  {sidebarOpen && <MobileSidebar />}
</div>
```

**Responsive Patterns**:
- Sidebar: Hidden on mobile, drawer on tablet, fixed on desktop
- Message input: Stacks buttons vertically on mobile
- Admin tables: Horizontal scroll on mobile
- Profile cards: Single column on mobile, grid on desktop

---

## 🔗 Backend API Integration

All API calls use `/api/*` prefix, proxied through Vite dev server to `http://localhost:3000`.

**Key Endpoints Used by Frontend**:

**Authentication**:
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/preferences` - Get user preferences
- `PUT /api/auth/preferences` - Update preferences

**Conversations**:
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/auto-name` - Generate title

**Messages**:
- `POST /api/conversations/:id/messages` - Send message (SSE streaming)
- `POST /api/feedback` - Submit message feedback (thumbs up/down)

**Memory**:
- `GET /api/memory` - Get all memory facts
- `POST /api/memory/extract/:conversationId` - Extract facts from conversation

**Admin**:
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

**Voice**:
- `POST /api/stt` - Speech-to-text (Google Cloud STT)
- `POST /api/tts` - Text-to-speech (Google Cloud TTS)

**Search**:
- `POST /api/search` - Manual web search (Google Custom Search API)

**Google Services**:
- `GET /api/google/status` - Check OAuth connection
- `GET /api/google/auth-url` - Get OAuth authorization URL
- `POST /api/google/gmail/send` - Send email via Gmail
- (Additional endpoints for Calendar, Drive, Docs, Sheets)

---

## 🎯 UI-Aware AI Function Calling

The frontend supports **real-time UI actions** triggered by the AI during streaming responses.

**Available Functions**:

1. **`changeModel`** - Switch AI model
   ```javascript
   { modelId: "gemini-2.5-pro" }
   ```

2. **`createNewChat`** - Start new conversation
   ```javascript
   { title: "My New Chat" }
   ```

3. **`renameConversation`** - Update conversation title
   ```javascript
   { conversationId: "...", newTitle: "Updated Title" }
   ```

4. **`deleteConversation`** - Delete conversation
   ```javascript
   { conversationId: "..." }
   ```

5. **`navigate`** - Navigate to different page
   ```javascript
   { path: "/profile" | "/preferences" | "/admin" }
   ```

6. **`webSearch`** - Trigger manual web search
   ```javascript
   { query: "latest AI news" }
   ```

**Function Call Flow**:
```
AI Function Call → Backend → SSE Event → Frontend Hook → UI Update
────────────────────────────────────────────────────────────────────

1. AI calls function during streaming
   → Backend includes in SSE stream: 
     data: {"type":"function_call","name":"navigate","args":{"path":"/profile"}}

2. Frontend EventSource receives event
   → useUIActions hook intercepts function_call type

3. Hook executes corresponding action:
   navigate("/profile")
   → React Router navigates to profile page
   → UI instantly updates

4. Action result sent back to AI:
   → Confirms successful execution
   → AI continues response with context
```

---

## 🎨 Advanced Features

### 1. Word-by-Word Audio Highlighting

**Components**: `MessageWithAudio.jsx`, `WordHighlighter.jsx`

**How It Works**:
1. User clicks speaker icon on AI message
2. Frontend: `GET /api/tts` with `includeTimings=true`
3. Backend returns: `{ audioUrl, timings: [{ word, start, end }] }`
4. Audio plays with synchronized highlighting:
   ```jsx
   timings.forEach(({ word, start, end }) => {
     setTimeout(() => {
       highlightWord(word);  // Add yellow background
     }, start * 1000);
   });
   ```

### 2. Typewriter Effect

**Hook**: `useTypewriter.js`

**Settings**:
- `instant`: No delay (disabled)
- `snappy`: 2ms per character
- `smooth`: 10ms per character
- `natural`: 20ms per character

**Usage**:
```javascript
const { displayedText, isTyping, skip } = useTypewriter(streamingContent, {
  speed: 'snappy',
  enabled: true
});
// Click anywhere to skip → instantly show full text
```

### 3. Conversation Insights

**Component**: `ConversationInsights.jsx`

**Data Displayed**:
- User messages count
- AI messages count
- Models used (with list)
- Auto-selected models count
- Memory facts extracted
- Positive/negative feedback
- Average rating

**Fetch**: `GET /api/conversations/:id/analytics`

### 4. Google Services Integration

**Component**: `GoogleConnection.jsx`

**OAuth Flow**:
1. User clicks "Connect Google" button
2. `GET /api/google/auth-url` → Returns authorization URL
3. User redirected to Google consent screen
4. Google redirects to `/google/callback?code=...`
5. Backend exchanges code for tokens
6. Connection status updates → UI shows connected services

**Connected Services UI**:
- Gmail ✅
- Calendar ✅
- Drive ✅
- Docs ✅
- Sheets ✅

---

## 📱 Mobile Considerations

**Touch Targets**: Minimum 44x44px (Apple HIG guidelines)
**Tap Interactions**: 
- Hover states replaced with active states on mobile
- Long-press for context menus
- Swipe gestures for sidebar (future enhancement)

**Performance**:
- Lazy loading for large conversation lists
- Virtual scrolling for messages (future enhancement)
- Image optimization with `loading="lazy"`

---

## 🔐 Security UI Patterns

1. **CSRF Protection**:
   - Token fetched on app load
   - Included in all POST/PUT/DELETE requests
   - Visible in Network tab as `X-CSRF-Token` header

2. **Secure File Uploads**:
   - Client-side file type validation
   - Size limit enforcement (5MB)
   - Upload progress indicators

3. **Sensitive Data Masking**:
   - API keys shown as: `sk-...xyz123` (first 3 + last 6 chars)
   - Passwords: Type `password` with visibility toggle
   - Phone numbers: Formatted and validated

---

## 🚀 Performance Optimizations

1. **React Query Caching**:
   - Conversations cached for 5 minutes
   - Messages cached until conversation changes
   - Automatic background refetching

2. **Code Splitting**:
   - Route-based lazy loading (future enhancement)
   - Dynamic imports for heavy components

3. **Memoization**:
   - `useMemo` for expensive calculations
   - `useCallback` for stable function references
   - React.memo for pure components

---

## 📚 Common UI Patterns

**Loading States**:
```jsx
{isLoading ? (
  <div className="flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin" />
  </div>
) : (
  <Content />
)}
```

**Error States**:
```jsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-700">{error}</p>
  </div>
)}
```

**Toast Notifications**:
```jsx
toast.success("Message sent!");
toast.error("Failed to send message");
toast.info("Processing...");
```

---

## 🎓 Learning Resources

For debugging frontend issues, check:
1. Browser DevTools Console (errors/warnings)
2. Network tab (API call failures)
3. React DevTools (component state)
4. TanStack Query DevTools (cache inspection)

---

**End of UI Architecture Documentation**
