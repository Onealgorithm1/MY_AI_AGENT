import { useCallback } from 'react';
import apiClient from '../services/api';

export function useEventTracking() {
  const trackEvent = useCallback(async (eventType, eventData = {}) => {
    try {
      await apiClient.post('/events/track', {
        eventType,
        eventData
      });
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }, []);

  const trackPageView = useCallback((pageName) => {
    trackEvent('page_view', { pageName });
  }, [trackEvent]);

  const trackButtonClick = useCallback((buttonName, context = {}) => {
    trackEvent('button_click', { buttonName, ...context });
  }, [trackEvent]);

  const trackConversationAction = useCallback((action, conversationId, metadata = {}) => {
    trackEvent('conversation_action', { action, conversationId, ...metadata });
  }, [trackEvent]);

  const trackMessageSent = useCallback((conversationId, messageLength, hasAttachment = false) => {
    trackEvent('message_sent', { conversationId, messageLength, hasAttachment });
  }, [trackEvent]);

  const trackVoiceAction = useCallback((action, duration = null) => {
    trackEvent('voice_action', { action, duration });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackConversationAction,
    trackMessageSent,
    trackVoiceAction
  };
}
