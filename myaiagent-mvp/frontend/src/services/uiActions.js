import apiClient from './api';

class UIActionsService {
  async executeAction(action, params = {}) {
    try {
      const response = await apiClient.post('/ui-actions/execute', {
        action,
        params
      });
      return response.data;
    } catch (error) {
      console.error('Action execution failed:', error);
      throw error.response?.data || error;
    }
  }

  async validateAction(action, params = {}) {
    try {
      const response = await apiClient.post('/ui-actions/validate', {
        action,
        params
      });
      return response.data;
    } catch (error) {
      console.error('Action validation failed:', error);
      throw error.response?.data || error;
    }
  }

  async getAvailableActions() {
    try {
      const response = await apiClient.get('/ui-actions/available');
      return response.data.actions;
    } catch (error) {
      console.error('Failed to fetch available actions:', error);
      throw error.response?.data || error;
    }
  }

  async getActionHistory(limit = 50) {
    try {
      const response = await apiClient.get(`/ui-actions/history?limit=${limit}`);
      return response.data.history;
    } catch (error) {
      console.error('Failed to fetch action history:', error);
      throw error.response?.data || error;
    }
  }

  async navigate(page, conversationId = null) {
    return this.executeAction('navigate', { page, conversationId });
  }

  async createNewChat() {
    return this.executeAction('createNewChat', {});
  }

  async switchConversation(conversationId) {
    return this.executeAction('switchConversation', { conversationId });
  }

  async deleteConversation(conversationId) {
    return this.executeAction('deleteConversation', { conversationId });
  }

  async pinConversation(conversationId, isPinned) {
    return this.executeAction('pinConversation', { conversationId, isPinned });
  }

  async renameConversation(conversationId, newTitle) {
    return this.executeAction('renameConversation', { conversationId, newTitle });
  }

  async changeModel(model) {
    return this.executeAction('changeModel', { model });
  }

  async uploadFile(conversationId) {
    return this.executeAction('uploadFile', { conversationId });
  }

  async startVoiceChat() {
    return this.executeAction('startVoiceChat', {});
  }

  async giveFeedback(messageId, rating) {
    return this.executeAction('giveFeedback', { messageId, rating });
  }
}

export default new UIActionsService();
