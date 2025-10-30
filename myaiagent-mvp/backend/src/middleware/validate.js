import Joi from 'joi';
import logger from '../utils/logger.js';

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation failed', { errors, path: req.path });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required(),
    fullName: Joi.string().min(1).max(255).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().required().max(128),
  }),

  // Conversation schemas
  createConversation: Joi.object({
    title: Joi.string().min(1).max(255).required(),
  }),

  updateConversation: Joi.object({
    title: Joi.string().min(1).max(255),
    pinned: Joi.boolean(),
  }).min(1), // At least one field must be present

  // Message schemas
  createMessage: Joi.object({
    content: Joi.string().min(1).max(50000).required(),
    conversationId: Joi.number().integer().positive().required(),
    model: Joi.string().valid('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo').default('gpt-4o'),
  }),

  // Memory schemas
  addMemoryFact: Joi.object({
    fact: Joi.string().min(1).max(1000).required(),
    category: Joi.string().max(100).optional(),
  }),

  // Feedback schemas
  feedback: Joi.object({
    messageId: Joi.number().integer().positive().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional().allow(''),
  }),

  // API secrets schemas
  addSecret: Joi.object({
    keyName: Joi.string().valid('OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'ANTHROPIC_API_KEY').required(),
    keyValue: Joi.string().min(20).max(500).required(),
  }),

  updateSecret: Joi.object({
    keyValue: Joi.string().min(20).max(500).required(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export default validate;
