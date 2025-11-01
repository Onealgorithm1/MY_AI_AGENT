import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { uiSchema, getUISchemaForContext } from '../schemas/uiSchema.js';

const router = express.Router();

/**
 * GET /api/ui-schema
 * Returns the complete UI schema
 */
router.get('/', authenticate, cacheControl(300), (req, res) => {
  try {
    res.json({
      success: true,
      schema: uiSchema
    });
  } catch (error) {
    console.error('UI schema error:', error);
    res.status(500).json({ error: 'Failed to retrieve UI schema' });
  }
});

/**
 * GET /api/ui-schema/context
 * Returns contextual UI schema based on current user state
 */
router.get('/context', authenticate, (req, res) => {
  try {
    const { currentPage, conversationId } = req.query;
    const userRole = req.user?.role || 'user';

    const contextualSchema = getUISchemaForContext(
      userRole,
      currentPage || 'chat',
      conversationId ? { id: conversationId } : null
    );

    res.json({
      success: true,
      context: contextualSchema
    });
  } catch (error) {
    console.error('UI context error:', error);
    res.status(500).json({ error: 'Failed to retrieve UI context' });
  }
});

/**
 * GET /api/ui-schema/workflows
 * Returns available workflows
 */
router.get('/workflows', authenticate, cacheControl(300), (req, res) => {
  try {
    res.json({
      success: true,
      workflows: uiSchema.workflows
    });
  } catch (error) {
    console.error('Workflows error:', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

export default router;
