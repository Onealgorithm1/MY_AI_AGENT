import apiClient from './api';

class EventsService {
  async trackEvent(eventType, eventData = {}) {
    try {
      const response = await apiClient.post('/events/track', {
        eventType,
        eventData
      });
      return response.data;
    } catch (error) {
      console.error('Event tracking failed:', error);
      throw error.response?.data || error;
    }
  }

  async getRecentEvents(limit = 50) {
    try {
      const response = await apiClient.get(`/events/recent?limit=${limit}`);
      return response.data.events;
    } catch (error) {
      console.error('Failed to fetch recent events:', error);
      throw error.response?.data || error;
    }
  }

  async getEventsSince(timestamp) {
    try {
      const response = await apiClient.get(`/events/since?timestamp=${timestamp}`);
      return response.data.events;
    } catch (error) {
      console.error('Failed to fetch events since timestamp:', error);
      throw error.response?.data || error;
    }
  }
}

export default new EventsService();
