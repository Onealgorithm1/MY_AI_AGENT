import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { plankaService } from '../services/planka.js';

const router = express.Router();

router.post('/cards', authenticate, async (req, res) => {
  try {
    const { name, description, dueDate, conversationId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Card name is required' });
    }

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    const card = await plankaService.createCard(plankaUserId, req.user.id, req.user.email, {
      name,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      type: 'project'
    });

    if (conversationId) {
      await plankaService.linkCardToConversation(card.id, conversationId, req.user.id, plankaUserId);
    }

    res.json({
      success: true,
      card
    });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create card' });
  }
});

router.get('/cards', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.query;

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    let cards;
    if (conversationId) {
      cards = await plankaService.getCardsForConversation(conversationId, req.user.id, plankaUserId);
    } else {
      cards = await plankaService.getCards(plankaUserId, req.user.email);
    }

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

router.patch('/cards/:cardId', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { name, description, isDueCompleted, listName } = req.body;

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    const card = await plankaService.updateCard(cardId, plankaUserId, {
      name,
      description,
      isDueCompleted,
      listName
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      card
    });
  } catch (error) {
    console.error('Error updating card:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update card' });
  }
});

router.delete('/cards/:cardId', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    await plankaService.deleteCard(cardId, plankaUserId);

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

router.post('/cards/:cardId/tasks', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { name, isCompleted } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    const task = await plankaService.createTask(plankaUserId, cardId, {
      name,
      isCompleted: isCompleted || false
    });

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/cards/:cardId/tasks', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    const tasks = await plankaService.getTasksForCard(cardId, plankaUserId);

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.patch('/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name, isCompleted } = req.body;

    const plankaUserId = await plankaService.ensureUserExists(
      req.user.id,
      req.user.email,
      req.user.full_name
    );

    const task = await plankaService.updateTask(taskId, plankaUserId, {
      name,
      isCompleted
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
