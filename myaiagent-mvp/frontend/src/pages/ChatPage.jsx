import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversations as conversationsApi, messages as messagesApi, feedback as feedbackApi, memory as memoryApi, fetchCsrfToken, getCsrfToken, tts, auth as authApi, webSearch as webSearchApi } from '../services/api';
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
  ThumbsUp,
  ThumbsDown,
  Brain,
  BarChart3,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Search,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConversationInsights from '../components/ConversationInsights';
import SearchResults from '../components/SearchResults';
import SearchingIndicator from '../components/SearchingIndicator';
import VoiceSelector from '../components/VoiceSelector';
import MessageWithAudio from '../components/MessageWithAudio';
import useTypewriter from '../hooks/useTypewriter';
import useSpeechToText from '../hooks/useSpeechToText';

// Helper function to get base URL for serving uploaded files
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  // Remove /api suffix if present to get base URL
  return apiUrl.replace(/\/api$/, '');
};

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
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  
  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Neural2-F');
  const [ttsAutoPlay, setTtsAutoPlay] = useState(false);
  
  // Typewriter state
  const [typingSpeed, setTypingSpeed] = useState('snappy');
  const [streamingContent, setStreamingContent] = useState('');
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [manualSearchResults, setManualSearchResults] = useState(null);
  
  // Typewriter for streaming message
  const { displayedText: typewriterText, isTyping, skip: skipTypewriter } = useTypewriter(
    streamingContent,
    {
      speed: typingSpeed,
      enabled: streamingContent.length > 0,
    }
  );
  
  // Speech-to-text hook
  const { 
    isRecording, 
    isProcessing, 
    error: sttError, 
    startRecording, 
    stopRecording, 
    cancelRecording 
  } = useSpeechToText();

  // Get memory facts count
  const { data: memoryData } = useQuery({
    queryKey: ['memory', 'approved'],
    queryFn: async () => {
      try {
        const response = await memoryApi.list(null, true);
        return response.data.facts || [];
      } catch (error) {
        console.error('Failed to fetch memory facts:', error);
        return [];
      }
    },
  });

  const memoryFactsCount = memoryData?.length || 0;

  // Get conversations with auto-refetch to catch auto-generated titles
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.list(20);
      return response.data.conversations;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to catch auto-generated titles
  });

  const conversations = conversationsData || [];

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: () => conversationsApi.create('New Chat', selectedModel),
    onSuccess: (response) => {
      // Set the current conversation immediately using the response data
      const newConversation = response.data.conversation;
      useChatStore.getState().setCurrentConversation(newConversation);
      
      // Clear messages for the new conversation
      setMessages([]);
      
      // Invalidate and refetch conversations list
      queryClient.invalidateQueries(['conversations']);
    },
  });

  // Load messages for conversation
  const loadConversation = async (conversationId, clearFirst = true) => {
    try {
      // Only clear messages when switching conversations, not when refreshing
      if (clearFirst) {
        setMessages([]);
      }
      
      const response = await conversationsApi.getMessages(conversationId);
      setMessages(response.data.messages);
      
      // Set the current conversation - try to find in conversations array first
      let conv = conversations.find(c => c.id === conversationId);
      
      // If not found (e.g., new conversation not yet in list), fetch it directly
      if (!conv) {
        try {
          const convResponse = await conversationsApi.list(20);
          conv = convResponse.data.conversations.find(c => c.id === conversationId);
        } catch (err) {
          console.error('Failed to fetch conversation details:', err);
        }
      }
      
      if (conv) {
        useChatStore.getState().setCurrentConversation(conv);
      }
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };


  const handleTtsToggle = async (enabled) => {
    setTtsEnabled(enabled);
    
    try {
      await authApi.updatePreferences({ tts_enabled: enabled });
      toast.success(enabled ? 'Voice enabled' : 'Voice disabled');
    } catch (error) {
      console.error('Failed to save TTS preference:', error);
      toast.error('Failed to save preference');
    }
  };

  const handleVoiceChange = async (voiceId) => {
    setSelectedVoice(voiceId);
    
    try {
      await authApi.updatePreferences({ tts_voice_id: voiceId });
    } catch (error) {
      console.error('Failed to save voice preference:', error);
      toast.error('Failed to save voice preference');
    }
  };

  const handleAutoPlayToggle = async (enabled) => {
    setTtsAutoPlay(enabled);
    
    try {
      await authApi.updatePreferences({ tts_auto_play: enabled });
      toast.success(enabled ? 'Auto-play enabled' : 'Auto-play disabled');
    } catch (error) {
      console.error('Failed to save auto-play preference:', error);
      toast.error('Failed to save preference');
    }
  };

  // Load TTS and typing preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data } = await authApi.getPreferences();
        if (data.tts_enabled !== undefined) {
          setTtsEnabled(data.tts_enabled);
        }
        if (data.tts_voice_id) {
          // Validate voice ID format (Google TTS format: en-US-Neural2-F)
          const isGoogleVoice = /^[a-zA-Z]{2}-[a-zA-Z]{2}-[a-zA-Z0-9\-]+$/.test(data.tts_voice_id);
          const isOldElevenLabsVoice = /^[a-zA-Z0-9]{15,30}$/.test(data.tts_voice_id);
          
          if (isGoogleVoice) {
            setSelectedVoice(data.tts_voice_id);
          } else if (isOldElevenLabsVoice) {
            // Migrate old ElevenLabs voice ID to Google TTS
            console.warn('Migrating old ElevenLabs voice ID to Google TTS');
            const defaultVoice = 'en-US-Neural2-F'; // Google Neural2 Female
            setSelectedVoice(defaultVoice);
            // Save the new voice ID
            await authApi.updatePreferences({ tts_voice_id: defaultVoice });
            toast.info('Switched to Google Text-to-Speech. Please select your preferred voice.');
          } else {
            // Invalid voice ID detected - reset to default and save
            console.warn('Invalid voice ID detected, resetting to default');
            const defaultVoice = 'en-US-Neural2-F'; // Google Neural2 Female
            setSelectedVoice(defaultVoice);
            // Save the corrected voice ID
            await authApi.updatePreferences({ tts_voice_id: defaultVoice });
            toast.info('Voice preference has been reset. Please select your preferred voice.');
          }
        }
        if (data.tts_auto_play !== undefined) {
          setTtsAutoPlay(data.tts_auto_play);
        }
        if (data.typing_speed) {
          setTypingSpeed(data.typing_speed);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    
    loadPreferences();
  }, []);


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
    setStreamingContent('');

    try {
      // Get API base URL - use relative path for Vite proxy
      const apiUrl = '/api';
      
      // Get CSRF token for the request
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.warn('⚠️ CSRF token missing, fetching...');
        await fetchCsrfToken();
      }
      
      // Send message with streaming
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(), // SECURITY: CSRF protection
        },
        credentials: 'include', // SECURITY: Send cookies (JWT)
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
                setStreamingContent(fullResponse);
              }
              
              if (data.done) {
                // Clear streaming after a brief delay to allow typewriter to finish
                setTimeout(() => {
                  setStreamingMessage('');
                  setStreamingContent('');
                }, 100);
                
                // Reload conversation to get the actual message with server-issued ID
                // Pass false to avoid clearing messages (prevents scroll jump)
                await loadConversation(conversationId, false);
                
                // Handle UI actions from AI
                if (data.action) {
                  handleAIAction(data.action);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // For large conversations (50+ messages), add fallback polling
      // This ensures responses appear even if streaming fails
      if (messages.length >= 50) {
        console.log('⚡ Large conversation detected - starting fallback polling');
        const startTime = Date.now();
        const pollInterval = setInterval(async () => {
          const elapsed = Date.now() - startTime;
          
          // Poll for 10 seconds max
          if (elapsed > 10000) {
            clearInterval(pollInterval);
            return;
          }
          
          // Reload to check for new messages
          await loadConversation(conversationId, false);
        }, 2000); // Poll every 2 seconds
        
        // Clean up polling when streaming completes
        completion.on('end', () => {
          clearInterval(pollInterval);
        });
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingMessage('');
      setIsSending(false);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Original catch block continuation
  const handleStreamingError = (error) => {
    if (error.message) {
      console.error('Stream processing error:', error);
      
      // For large conversations, reload to ensure message appears
      if (messages.length >= 50) {
        setTimeout(() => {
          loadConversation(conversationId, false);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Rest of component */}
      const originalCatch = `            } catch (e) {
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
      setStreamingContent('');
    } finally {
      setIsSending(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await conversationsApi.create('New Chat', selectedModel);
      queryClient.invalidateQueries(['conversations']);
      return response.data.conversation.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create new chat');
      return null;
    }
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

  // Submit feedback
  const submitFeedback = async (messageId, rating) => {
    try {
      // Only allow feedback on messages with valid server IDs (not temporary client-side IDs)
      if (!messageId || typeof messageId === 'number') {
        toast.error('Cannot rate this message yet');
        return;
      }

      await feedbackApi.submit({
        messageId,
        conversationId: currentConversation?.id,
        rating,
      });

      toast.success(rating === 1 ? 'Thanks for the positive feedback!' : 'Thanks for your feedback!');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
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
        useChatStore.getState().setCurrentConversation(null);
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
        // AI already created the conversation, use it from action.result
        if (action.result?.conversation) {
          const newConv = action.result.conversation;
          
          // Refresh conversations list from server to get the new chat
          queryClient.invalidateQueries(['conversations']);
          
          // Switch to the new conversation
          setTimeout(() => {
            loadConversation(newConv.id);
          }, 100);
          
          toast.success(`Created new chat: ${newConv.title}`);
        } else {
          // Fallback to creating new conversation
          createConversation.mutate();
        }
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
  
  // Handle microphone button click
  const handleMicClick = async () => {
    if (isRecording) {
      try {
        const transcript = await stopRecording();
        if (transcript) {
          setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      } catch (error) {
        toast.error(sttError || 'Failed to transcribe audio');
      }
    } else {
      await startRecording();
    }
  };

  // Handle manual web search
  const handleManualSearch = async () => {
    const searchQuery = inputMessage.trim();
    if (!searchQuery) {
      const userQuery = prompt('Enter your search query:');
      if (!userQuery) return;
      setInputMessage(userQuery);
      performManualSearch(userQuery);
    } else {
      performManualSearch(searchQuery);
      setInputMessage('');
    }
  };

  const performManualSearch = async (query) => {
    setIsManualSearching(true);
    setManualSearchResults(null);
    
    try {
      const results = await webSearchApi.search(query, 5);
      setManualSearchResults(results);
      toast.success(`Found ${results.results?.length || 0} results for "${query}"`);
    } catch (error) {
      console.error('Manual search error:', error);
      toast.error(error.response?.data?.error || 'Web search failed');
    } finally {
      setIsManualSearching(false);
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

        {/* Memory Counter */}
        {memoryFactsCount > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-gray-700 dark:text-gray-300">
                AI remembers <span className="font-semibold text-purple-600 dark:text-purple-400">{memoryFactsCount} facts</span> about you
              </span>
            </div>
          </div>
        )}

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {user?.profileImage ? (
              <img
                src={
                  user.profileImage.startsWith('http')
                    ? user.profileImage
                    : `${getBaseUrl()}${user.profileImage}`
                }
                alt={user?.fullName}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  // Fallback to default icon if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center ${user?.profileImage ? 'hidden' : ''}`}>
              <User className="w-4 h-4 text-white dark:text-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.fullName}
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
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
              <option value="gemini-2.5-flash">✨ Gemini 2.5 Flash • Latest & Fast</option>
              <option value="gemini-2.5-pro">🧠 Gemini 2.5 Pro • Most Powerful</option>
              <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash • Efficient</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {currentConversation && (
              <button
                onClick={() => setShowInsights(!showInsights)}
                className={`p-2 rounded-lg transition-colors ${
                  showInsights
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Conversation Insights"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}
            
            {/* TTS Toggle Button */}
            <button
              onClick={() => handleTtsToggle(!ttsEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                ttsEnabled 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
              }`}
              title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
            >
              {ttsEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm">Voice On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="text-sm">Voice Off</span>
                </>
              )}
            </button>
            
            {/* Voice Selector and Auto-play */}
            {ttsEnabled && (
              <>
                <VoiceSelector 
                  selectedVoice={selectedVoice}
                  onVoiceChange={handleVoiceChange}
                  className="w-48"
                />
                <label className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={ttsAutoPlay}
                    onChange={(e) => handleAutoPlayToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    aria-label="Auto-play voice responses"
                  />
                  <span>Auto-play</span>
                </label>
              </>
            )}
            
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
        </div>

        {/* Conversation Insights */}
        {showInsights && currentConversation && (
          <div className="px-4 pt-4">
            <ConversationInsights conversationId={currentConversation.id} />
          </div>
        )}

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
            {messages.map((message, index) => {
              const isLastAssistantMessage = 
                message.role === 'assistant' && 
                index === messages.length - 1;

              return (
                <div
                  key={message.id}
                  className={`group flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-white dark:text-gray-900" />
                    </div>
                  )}

                  {message.role === 'user' ? (
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ) : (
                    <MessageWithAudio
                      message={message}
                      voiceId={selectedVoice}
                      ttsEnabled={ttsEnabled}
                      ttsAutoPlay={ttsAutoPlay}
                      shouldAutoPlay={isLastAssistantMessage}
                      onCopy={copyToClipboard}
                      onFeedback={submitFeedback}
                      searchResults={
                        message.metadata?.searchResults && (
                          <SearchResults results={message.metadata.searchResults} />
                        )
                      }
                    />
                  )}

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white dark:text-gray-900" />
                    </div>
                  )}
                </div>
              );
            })}

            {streamingMessage && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white dark:text-gray-900" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                  <div className="whitespace-pre-wrap">
                    {streamingContent ? typewriterText : streamingMessage}
                  </div>
                  <span className="inline-block w-1 h-4 bg-gray-900 dark:bg-gray-100 animate-pulse ml-1" />
                </div>
                {isTyping && (
                  <button
                    onClick={skipTypewriter}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Skip typing animation"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}

            {/* Manual Search Indicator */}
            {isManualSearching && (
              <div className="flex justify-center px-4">
                <SearchingIndicator query={inputMessage} />
              </div>
            )}

            {/* Manual Search Results */}
            {!isManualSearching && manualSearchResults && (
              <div className="flex justify-center px-4">
                <div className="max-w-3xl w-full">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Manual Search Results
                    </h3>
                    <button
                      onClick={() => setManualSearchResults(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <SearchResults results={manualSearchResults} />
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

              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleManualSearch}
                disabled={isManualSearching}
                className={`p-2 rounded-lg transition-colors ${
                  isManualSearching
                    ? 'text-blue-400 animate-pulse cursor-wait'
                    : 'text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                title="Manual web search"
              >
                {isManualSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
              </button>

              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Message AI...'}
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
