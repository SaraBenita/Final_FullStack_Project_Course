import { Router } from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { authRequired } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
const router = Router();

router.get('/:conversationId', authRequired, async (req, res) => {
  const { conversationId } = req.params;
  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.map(String).includes(req.user.id)) return res.status(403).json({ message: 'not a participant' });
  const msgs = await Message.find({ conversation: conversationId })
    .populate('sender', 'username displayName email')
    .sort({ createdAt: 1 })
    .limit(500);
  res.json(msgs);
});

router.post('/', authRequired, async (req, res) => {
  const { conversationId, body, attachment } = req.body;
  if (!conversationId || (!body && !attachment)) return res.status(400).json({ message: 'conversationId and body or attachment required' });
  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.map(String).includes(req.user.id)) return res.status(403).json({ message: 'not a participant' });
  const others = convo.participants.map(String).filter(id => id !== req.user.id);
  const msgData = { conversation: conversationId, sender: req.user.id, deliveredTo: others };
  if (body) msgData.body = body;
  if (attachment) msgData.attachment = attachment;
  const msg = await Message.create(msgData);
  convo.lastMessageAt = new Date(); await convo.save();
  const populated = await Message.findById(msg._id).populate('sender', 'username displayName email');
  res.status(201).json(populated);
});

router.post('/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const base = req.protocol + '://' + req.get('host');
  const fileUrl = `${base}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
});

router.post('/:conversationId/read', authRequired, async (req, res) => {
  const { conversationId } = req.params; const { messageIds } = req.body || {};
  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.map(String).includes(req.user.id)) return res.status(403).json({ message: 'not a participant' });
  const filter = { conversation: conversationId, sender: { $ne: req.user.id } };
  if (Array.isArray(messageIds) && messageIds.length) filter._id = { $in: messageIds };
  const result = await Message.updateMany(filter, { $addToSet: { readBy: req.user.id } });
  res.json({ updated: result.modifiedCount });
});

export default router;
