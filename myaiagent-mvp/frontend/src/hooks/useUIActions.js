import { useState, useCallback } from 'react';
import uiActionsService from '../services/uiActions';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';

export function useUIActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { 
    setConversations, 
    setCurrentConversation, 
    currentConversation,
    conversations
  } = useChatStore();

  const executeAction = useCallback(async (action, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await uiActionsService.executeAction(action, params);
      
      switch (action) {
        case 'navigate':
          if (result.result.navigateTo) {
            navigate(`/${result.result.navigateTo}`);
          }
          break;
          
        case 'createNewChat':
          if (result.result.conversation) {
            setCurrentConversation(result.result.conversation);
            setConversations([result.result.conversation, ...conversations]);
            navigate('/chat');
          }
          break;
          
        case 'switchConversation':
          if (result.result.conversation) {
            setCurrentConversation(result.result.conversation);
          }
          break;
          
        case 'deleteConversation':
          if (result.result.deletedConversationId) {
            const updated = conversations.filter(
              c => c.id !== result.result.deletedConversationId
            );
            setConversations(updated);
            
            if (currentConversation?.id === result.result.deletedConversationId) {
              setCurrentConversation(updated[0] || null);
            }
          }
          break;
          
        case 'pinConversation':
          if (result.result.conversation) {
            const updated = conversations.map(c =>
              c.id === result.result.conversation.id ? result.result.conversation : c
            );
            setConversations(updated);
            
            if (currentConversation?.id === result.result.conversation.id) {
              setCurrentConversation(result.result.conversation);
            }
          }
          break;
          
        case 'renameConversation':
          if (result.result.conversation) {
            const updated = conversations.map(c =>
              c.id === result.result.conversation.id ? result.result.conversation : c
            );
            setConversations(updated);
            
            if (currentConversation?.id === result.result.conversation.id) {
              setCurrentConversation(result.result.conversation);
            }
          }
          break;
          
        case 'changeModel':
          if (result.result.conversation) {
            setCurrentConversation(result.result.conversation);
          }
          break;
      }
      
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Action execution failed');
      setLoading(false);
      throw err;
    }
  }, [navigate, conversations, currentConversation, setConversations, setCurrentConversation]);

  return {
    executeAction,
    loading,
    error
  };
}
