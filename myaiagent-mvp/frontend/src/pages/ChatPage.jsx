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
  Shield,
  MoreVertical,
  Pin,
  Trash2,
  ChevronDown,
  Loader2,
  Edit2,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const navigate = useNavigate();
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
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

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
      
      // Set the current conversation
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        useChatStore.getState().setCurrentConversation(conv);
      }
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
    setStreamingMessage('●●●');

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

      // Check for HTTP errors before streaming
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        toast.error(errorData.error || 'Failed to send message');
        setStreamingMessage('');
        setIsSending(false);
        return;
      }

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
              
              // Handle error events
              if (data.error) {
                toast.error(data.error);
                setStreamingMessage('');
                setIsSending(false);
                return;
              }
              
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
                
                // Handle UI actions from AI
                if (data.action) {
                  handleAIAction(data.action);
                }
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

  // Copy message to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Rename conversation
  const handleRename = async (convId, newTitle) => {
    try {
      await conversationsApi.update(convId, { title: newTitle });
      queryClient.invalidateQueries(['conversations']);
      toast.success('Chat renamed successfully');
      setEditingConvId(null);
      setEditingTitle('');
    } catch (error) {
      toast.error('Failed to rename chat');
    }
  };

  // Toggle pin conversation
  const handleTogglePin = async (convId, currentPinned) => {
    try {
      await conversationsApi.update(convId, { pinned: !currentPinned });
      queryClient.invalidateQueries(['conversations']);
      toast.success(currentPinned ? 'Chat unpinned' : 'Chat pinned');
    } catch (error) {
      toast.error('Failed to update chat');
    }
  };

  // Delete conversation
  const handleDelete = async (convId) => {
    try {
      await conversationsApi.delete(convId);
      setDeleteConfirmId(null);
      
      // If deleting the current conversation, clear it
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      // Refresh conversation list
      queryClient.invalidateQueries(['conversations']);
      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  // Start editing
  const startEditing = (convId, currentTitle) => {
    setEditingConvId(convId);
    setEditingTitle(currentTitle);
    setMenuOpenId(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  // Handle AI-triggered actions
  const handleAIAction = (action) => {
    console.log('🤖 Executing AI action:', action);
    
    switch (action.type) {
      case 'changeModel':
        if (action.params?.model) {
          setSelectedModel(action.params.model);
          toast.success(`Switched to ${action.params.model}`);
        }
        break;
        
      case 'createNewChat':
        createConversation.mutate();
        break;
        
      case 'deleteConversation':
        if (currentConversation) {
          handleDelete(currentConversation.id);
        }
        break;
        
      case 'renameConversation':
        if (currentConversation && action.params?.title) {
          handleRename(currentConversation.id, action.params.title);
        }
        break;
        
      case 'navigate':
        if (action.params?.page) {
          navigate(`/${action.params.page === 'chat' ? '' : action.params.page}`);
        }
        break;
        
      default:
        console.log('Unknown action type:', action.type);
    }
  };

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null);
        setDeleteConfirmId(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Auto-load first conversation on page load
  useEffect(() => {
    if (conversations.length > 0 && !currentConversation) {
      const firstConv = conversations[0];
      loadConversation(firstConv.id);
    }
  }, [conversations, currentConversation]);

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
            <div
              key={conv.id}
              className="relative group mb-1"
            >
              {editingConvId === conv.id ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(conv.id, editingTitle);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(conv.id, editingTitle)}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadConversation(conv.id)}
                    className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    {conv.pinned && <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {conv.title || 'New Chat'}
                    </span>
                  </button>
                  <div 
                    className="relative"
                    onMouseLeave={() => setMenuOpenId(null)}
                  >
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === conv.id ? null : conv.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-100"
                      aria-label="Conversation actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === conv.id && (
                      <div className="absolute right-0 top-6 z-10 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
                        <button
                          onClick={() => startEditing(conv.id, conv.title)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            handleTogglePin(conv.id, conv.pinned);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Pin className="w-4 h-4" />
                          {conv.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmId(conv.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Admin Panel"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
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
              <option value="auto">🤖 Auto (AI picks best model)</option>
              <option value="gpt-4o">GPT-4o • Smartest, Multimodal</option>
              <option value="gpt-4o-mini">GPT-4o Mini • Fast & Cheap ⚡</option>
              <option value="gpt-4-turbo">GPT-4 Turbo • Previous Gen</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo • Fastest 💨</option>
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
                  className={`max-w-[80%] rounded-2xl px-4 pt-3 pb-2 ${
                    message.role === 'user'
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap mb-1">{message.content}</div>
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Copy message"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {message.model === 'auto' ? 'Auto 🤖' : message.model}
                      </span>
                    </div>
                  )}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Chat?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete this chat and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
