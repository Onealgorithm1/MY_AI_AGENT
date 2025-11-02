import express from 'express';
import { 
  listEmails, 
  getEmailDetails, 
  sendEmail, 
  searchEmails,
  markAsRead,
  markAsUnread,
  archiveEmail,
  deleteEmail,
  getUnreadCount,
  checkGmailConnection
} from '../services/gmail.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Only authentication required - users can access their own Gmail via OAuth
router.use(authenticate);

router.get('/status', async (req, res) => {
  try {
    const status = await checkGmailConnection(req.user.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/emails', async (req, res) => {
  try {
    const { maxResults, query, labelIds } = req.query;
    
    const options = {
      maxResults: maxResults ? parseInt(maxResults) : 20,
      query: query || '',
      labelIds: labelIds ? labelIds.split(',') : ['INBOX']
    };

    const emails = await listEmails(req.user.id, options);
    res.json({ emails, count: emails.length });
  } catch (error) {
    console.error('GET /api/gmail/emails error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const email = await getEmailDetails(req.user.id, id);
    res.json(email);
  } catch (error) {
    console.error(`GET /api/gmail/emails/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, maxResults } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const emails = await searchEmails(req.user.id, q, maxResults ? parseInt(maxResults) : 20);
    res.json({ emails, count: emails.length, query: q });
  } catch (error) {
    console.error('GET /api/gmail/search error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { to, subject, body, html } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject are required' });
    }

    const result = await sendEmail(req.user.id, { to, subject, body, html });
    res.json(result);
  } catch (error) {
    console.error('POST /api/gmail/send error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/emails/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await markAsRead(req.user.id, id);
    res.json(result);
  } catch (error) {
    console.error(`PUT /api/gmail/emails/${req.params.id}/read error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/emails/:id/unread', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await markAsUnread(req.user.id, id);
    res.json(result);
  } catch (error) {
    console.error(`PUT /api/gmail/emails/${req.params.id}/unread error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/emails/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await archiveEmail(req.user.id, id);
    res.json(result);
  } catch (error) {
    console.error(`PUT /api/gmail/emails/${req.params.id}/archive error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteEmail(req.user.id, id);
    res.json(result);
  } catch (error) {
    console.error(`DELETE /api/gmail/emails/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const counts = await getUnreadCount(req.user.id);
    res.json(counts);
  } catch (error) {
    console.error('GET /api/gmail/unread-count error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
