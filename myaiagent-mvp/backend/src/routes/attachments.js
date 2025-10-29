import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeImage } from '../services/openai.js';
import { incrementFileCount } from '../middleware/rateLimit.js';

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
      'text/javascript',
      'text/html',
      'text/css',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  },
});

// Upload file
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { conversationId, messageId } = req.body;

    // Save to database
    const result = await query(
      `INSERT INTO attachments 
       (user_id, conversation_id, message_id, file_name, file_type, file_size, file_path, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        conversationId || null,
        messageId || null,
        req.file.originalname,
        path.extname(req.file.originalname),
        req.file.size,
        req.file.path,
        req.file.mimetype,
      ]
    );

    const attachment = result.rows[0];

    // Increment file upload count
    await incrementFileCount(req.user.id);

    // Auto-analyze images
    if (req.file.mimetype.startsWith('image/')) {
      try {
        // Convert file path to base64 data URL for OpenAI
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const analysis = await analyzeImage(dataUrl);

        // Update attachment with analysis
        await query(
          `UPDATE attachments 
           SET analysis_result = $1, status = 'completed'
           WHERE id = $2`,
          [JSON.stringify({ description: analysis }), attachment.id]
        );

        attachment.analysis_result = { description: analysis };
        attachment.status = 'completed';
      } catch (error) {
        console.error('Image analysis error:', error);
        await query(
          `UPDATE attachments SET status = 'failed' WHERE id = $1`,
          [attachment.id]
        );
      }
    }

    res.status(201).json({
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        mimeType: attachment.mime_type,
        status: attachment.status,
        analysisResult: attachment.analysis_result,
        createdAt: attachment.created_at,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get attachment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM attachments WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Send file
    res.sendFile(path.resolve(attachment.file_path));
  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({ error: 'Failed to get attachment' });
  }
});

// Delete attachment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM attachments WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Delete file from disk
    if (fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }

    // Delete from database
    await query('DELETE FROM attachments WHERE id = $1', [id]);

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// Get attachments for conversation
router.get('/conversation/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await query(
      `SELECT a.* FROM attachments a
       JOIN conversations c ON a.conversation_id = c.id
       WHERE a.conversation_id = $1 AND c.user_id = $2
       ORDER BY a.created_at DESC`,
      [conversationId, req.user.id]
    );

    res.json({ attachments: result.rows });
  } catch (error) {
    console.error('Get conversation attachments error:', error);
    res.status(500).json({ error: 'Failed to get attachments' });
  }
});

export default router;
