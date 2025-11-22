import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const convos = await Conversation.find({ participants: req.user.id })
    .populate('participants', 'username displayName email isOnline')
    .sort({ updatedAt: -1 });

  res.json(convos);
});

router.post('/', authRequired, async (req, res) => {
  try {
    const { participantIds, isGroup = false, name } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'participantIds required' });
    }

    const participants = Array.from(
      new Set([String(req.user.id), ...participantIds.map(String)])
    );

    if (!isGroup && participants.length === 2) {
      const existing = await Conversation.findOne({
        isGroup: false,
        participants: { $all: participants },
        $expr: { $eq: [{ $size: '$participants' }, 2] },
      }).populate(
        'participants',
        'username displayName email isOnline'
      );

      if (existing) {
        participants.forEach((uid) =>
          req.io.to(`u:${uid}`).emit('conversation:new', existing)
        );
        return res.json(existing);
      }
    }


    if (isGroup && !name) {
      return res
        .status(400)
        .json({ message: 'Group name required', reason: 'group_name_required' });
    }

 
    const convo = await Conversation.create({
      participants,
      isGroup: !!isGroup,
      name: isGroup ? name : undefined,
    });

    const populated = await Conversation.findById(convo._id).populate(
      'participants',
      'username displayName email isOnline'
    );

    participants.forEach((uid) =>
      req.io.to(`u:${uid}`).emit('conversation:new', populated)
    );

    res.status(201).json(populated);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        message: 'Group name already exists',
        reason: 'group_name_exists',
      });
    }
    console.error('Create conversation error:', e);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});


router.patch('/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const convo = await Conversation.findById(id);
  if (!convo)
    return res.status(404).json({ message: 'conversation not found' });

  if (!convo.isGroup)
    return res
      .status(400)
      .json({ message: 'rename allowed only for groups' });

  if (!convo.participants.map(String).includes(req.user.id))
    return res.status(403).json({ message: 'not a participant' });

  convo.name = name || convo.name;
  await convo.save();

  const populated = await Conversation.findById(id).populate(
    'participants',
    'username displayName email isOnline'
  );

  convo.participants.forEach((uid) =>
    req.io.to(`u:${uid}`).emit('conversation:updated', populated)
  );

  res.json(populated);
});

export default router;
