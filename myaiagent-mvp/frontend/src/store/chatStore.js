import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  streamingMessage: '',
  error: null,

  // Set conversations
  setConversations: (conversations) => set({ conversations }),

  // Set current conversation
  setCurrentConversation: (conversation) => 
    set({ currentConversation: conversation }),

  // Set messages
  setMessages: (messages) => set({ messages }),

  // Add message
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  // Update message
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  // Delete message
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    })),

  // Set streaming message
  setStreamingMessage: (content) => set({ streamingMessage: content }),

  // Clear streaming message
  clearStreamingMessage: () => set({ streamingMessage: '' }),

  // Set loading state
  setIsLoading: (isLoading) => set({ isLoading }),

  // Set sending state
  setIsSending: (isSending) => set({ isSending }),

  // Set error
  setError: (error) => set({ error }),

  // Clear error
  clearError: () => set({ error: null }),

  // Clear all
  clearChat: () =>
    set({
      messages: [],
      streamingMessage: '',
      error: null,
    }),
}));
