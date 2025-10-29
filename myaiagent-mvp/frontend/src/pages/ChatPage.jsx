import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversations as conversationsApi, messages as messagesApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { toast } from 'sonner';
import {
  MessageCircle,
  Plus,
  Send,
  Mic,
  MicOff,
  Paperclip,
  User,
  LogOut,
  Settings,
  MoreVertical,
  Pin,
  Trash2,
  ChevronDown,
  Loader2,
} from 'lucide-react';

export default function ChatPage() {
  const { user, logout } = useAuthStore();
  const {
    currentConversation,
    messages,
    setMessages,
    addMessage,
    streamingMessage,
    setStreamingMessage,
    isSending,
    setIsSending,
  } = useChatStore();

  const queryClient = useQueryClient();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef(null);

  // Get conversations
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.list(20);
      return response.data.conversations;
    },
  });

  const conversations = conversationsData || [];

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: () => conversationsApi.create('New Chat', selectedModel),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['conversations']);
      loadConversation(response.data.conversation.id);
    },
  });

  // Load messages for conversation
  const loadConversation = async (conversationId) => {
    try {
      const response = await conversationsApi.getMessages(conversationId);
      setMessages(response.data.messages);
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const conversationId = currentConversation?.id || (await createNewConversation());
    if (!conversationId) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInputMessage('');
    setIsSending(true);
    setStreamingMessage('');

    try {
      // Send message with streaming
      const response = await fetch(import.meta.env.VITE_API_URL + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          conversationId,
          content: userMessage.content,
          model: selectedModel,
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.content) {
                fullResponse += data.content;
                setStreamingMessage(fullResponse);
              }
              if (data.done) {
                addMessage({
                  id: Date.now(),
                  role: 'assistant',
                  content: fullResponse,
                  model: selectedModel,
                  created_at: new Date().toISOString(),
                });
                setStreamingMessage('');
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      setStreamingMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const createNewConversation = async () => {
    const response = await conversationsApi.create('New Chat', selectedModel);
    queryClient.invalidateQueries(['conversations']);
    return response.data.conversation.id;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => createConversation.mutate()}
            className="w-full flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New chat</span>
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left mb-1"
            >
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                {conv.title || 'New Chat'}
              </span>
            </button>
          ))}
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white dark:text-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.fullName}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            >
              <option value="gpt-4o">GPT-4o (Smartest)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
            </select>
          </div>

          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`p-2 rounded-lg transition-colors ${
              isVoiceActive
                ? 'bg-red-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Voice Mode"
          >
            {isVoiceActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !streamingMessage && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-900 dark:bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-white dark:text-gray-900" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  How can I help you today?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a conversation with AI
                </p>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-white dark:text-gray-900" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white dark:text-gray-900" />
                  </div>
                )}
              </div>
            ))}

            {streamingMessage && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white dark:text-gray-900" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                  <div className="whitespace-pre-wrap">{streamingMessage}</div>
                  <span className="inline-block w-1 h-4 bg-gray-900 dark:bg-gray-100 animate-pulse ml-1" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message AI..."
                rows={1}
                className="flex-1 resize-none px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                style={{ maxHeight: '200px' }}
              />

              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
