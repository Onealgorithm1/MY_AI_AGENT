import pool from '../utils/database.js';

const ALLOWED_ACTIONS = {
  navigate: {
    allowedParams: ['page', 'conversationId'],
    validate: (params) => {
      const validPages = ['chat', 'admin', 'login'];
      return validPages.includes(params.page);
    },
    execute: async (params, userId) => {
      return {
        navigateTo: params.page,
        conversationId: params.conversationId || null
      };
    }
  },
  
  createNewChat: {
    allowedParams: ['title'],
    validate: (params) => true,
    execute: async (params, userId) => {
      const title = params.title || 'New Conversation';
      const result = await pool.query(
        `INSERT INTO conversations (user_id, title, model) 
         VALUES ($1, $2, $3) 
         RETURNING id, title, model, created_at`,
        [userId, title, 'gpt-4o']
      );
      return {
        conversation: result.rows[0]
      };
    }
  },
  
  switchConversation: {
    allowedParams: ['conversationId'],
    validate: async (params, userId) => {
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      const result = await pool.query(
        'SELECT id, title, model, pinned FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return {
        conversation: result.rows[0]
      };
    }
  },
  
  deleteConversation: {
    allowedParams: ['conversationId'],
    validate: async (params, userId) => {
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      await pool.query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return {
        deletedConversationId: params.conversationId
      };
    }
  },
  
  pinConversation: {
    allowedParams: ['conversationId', 'isPinned'],
    validate: async (params, userId) => {
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      const result = await pool.query(
        'UPDATE conversations SET pinned = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, title, pinned',
        [params.isPinned, params.conversationId, userId]
      );
      return {
        conversation: result.rows[0]
      };
    }
  },
  
  renameConversation: {
    allowedParams: ['conversationId', 'newTitle'],
    validate: async (params, userId) => {
      if (!params.newTitle || params.newTitle.trim().length === 0) return false;
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      const result = await pool.query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, title',
        [params.newTitle.trim(), params.conversationId, userId]
      );
      return {
        conversation: result.rows[0]
      };
    }
  },
  
  changeModel: {
    allowedParams: ['model', 'conversationId'],
    validate: async (params, userId) => {
      const validModels = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ];
      if (!validModels.includes(params.model)) return false;
      
      if (params.conversationId) {
        const result = await pool.query(
          'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
          [params.conversationId, userId]
        );
        return result.rows.length > 0;
      }
      return true;
    },
    execute: async (params, userId) => {
      if (params.conversationId) {
        const result = await pool.query(
          'UPDATE conversations SET model = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, model',
          [params.model, params.conversationId, userId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Conversation not found or access denied');
        }
        
        return {
          conversation: result.rows[0]
        };
      }
      return {
        model: params.model
      };
    }
  },
  
  uploadFile: {
    allowedParams: ['conversationId'],
    validate: async (params, userId) => {
      if (!params.conversationId) return false;
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [params.conversationId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      return {
        conversationId: params.conversationId,
        action: 'trigger_file_upload'
      };
    }
  },
  
  startVoiceChat: {
    allowedParams: [],
    validate: (params) => true,
    execute: async (params, userId) => {
      const result = await pool.query(
        `INSERT INTO voice_sessions (user_id, status, started_at) 
         VALUES ($1, $2, NOW()) 
         RETURNING id, status, started_at`,
        [userId, 'active']
      );
      return {
        voiceSession: result.rows[0],
        action: 'start_voice_chat'
      };
    }
  },
  
  giveFeedback: {
    allowedParams: ['messageId', 'rating'],
    validate: async (params, userId) => {
      const validRatings = [1, -1];
      if (!validRatings.includes(params.rating)) return false;
      
      const result = await pool.query(
        `SELECT m.id FROM messages m 
         JOIN conversations c ON m.conversation_id = c.id 
         WHERE m.id = $1 AND c.user_id = $2`,
        [params.messageId, userId]
      );
      return result.rows.length > 0;
    },
    execute: async (params, userId) => {
      const existing = await pool.query(
        'SELECT id FROM feedback WHERE message_id = $1 AND user_id = $2',
        [params.messageId, userId]
      );
      
      if (existing.rows.length > 0) {
        const result = await pool.query(
          'UPDATE feedback SET rating = $1, created_at = NOW() WHERE message_id = $2 AND user_id = $3 RETURNING id, rating',
          [params.rating, params.messageId, userId]
        );
        return {
          feedback: result.rows[0],
          updated: true
        };
      } else {
        const result = await pool.query(
          'INSERT INTO feedback (message_id, user_id, rating) VALUES ($1, $2, $3) RETURNING id, rating',
          [params.messageId, userId, params.rating]
        );
        return {
          feedback: result.rows[0],
          updated: false
        };
      }
    }
  }
};

export class ActionExecutor {
  static async validateAction(actionType, params, userId) {
    if (!ALLOWED_ACTIONS[actionType]) {
      return {
        valid: false,
        error: 'Unknown action type'
      };
    }
    
    const actionConfig = ALLOWED_ACTIONS[actionType];
    
    const extraParams = Object.keys(params).filter(
      key => !actionConfig.allowedParams.includes(key)
    );
    
    if (extraParams.length > 0) {
      return {
        valid: false,
        error: `Unexpected parameters: ${extraParams.join(', ')}`
      };
    }
    
    try {
      const isValid = await actionConfig.validate(params, userId);
      
      if (!isValid) {
        return {
          valid: false,
          error: 'Action validation failed'
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Action validation error:', error);
      return {
        valid: false,
        error: 'Validation error occurred'
      };
    }
  }
  
  static async executeAction(actionType, params, userId) {
    const validation = await this.validateAction(actionType, params, userId);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const actionConfig = ALLOWED_ACTIONS[actionType];
    
    try {
      const executionResult = await actionConfig.execute(params, userId);
      
      await pool.query(
        'INSERT INTO ui_actions (user_id, action_type, action_params, executed_at, success) VALUES ($1, $2, $3::jsonb, NOW(), $4) RETURNING *',
        [userId, actionType, JSON.stringify(params), true]
      );
      
      return {
        success: true,
        action: actionType,
        result: executionResult
      };
    } catch (error) {
      console.error('Action execution error:', error);
      
      await pool.query(
        'INSERT INTO ui_actions (user_id, action_type, action_params, executed_at, success, error_message) VALUES ($1, $2, $3::jsonb, NOW(), $4, $5)',
        [userId, actionType, JSON.stringify(params), false, error.message]
      );
      
      throw error;
    }
  }
  
  static getAvailableActions(userRole = 'user') {
    const actions = Object.keys(ALLOWED_ACTIONS).map(actionType => ({
      type: actionType,
      params: ALLOWED_ACTIONS[actionType].allowedParams
    }));
    
    if (userRole !== 'admin') {
      return actions.filter(a => !a.type.startsWith('admin'));
    }
    
    return actions;
  }
}
