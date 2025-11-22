import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import Message from './models/Message.js';
import Conversation from './models/Conversation.js';
import User from './models/User.js';

const convoRoom = (id) => `c:${id}`;
const userRoom = (id) => `u:${id}`;

export function authSocketMiddleware(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) return next(new Error('no token'));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = String(payload.id);
    next();
  } catch (e) {
    next(new Error('invalid token'));
  }
}

export function registerSocketHandlers(io, socket) {
  // User online
  User.findByIdAndUpdate(socket.userId, {
    isOnline: true,
    lastSeenAt: new Date(),
  }).exec();

  socket.join(userRoom(socket.userId));
  socket.broadcast.emit('user:online', { userId: socket.userId });

  // Join/leave conversation room
  socket.on('conversation:join', (id) => socket.join(convoRoom(id)));
  socket.on('conversation:leave', (id) => socket.leave(convoRoom(id)));

  // -----------------------------
  //        SEND MESSAGE
  // -----------------------------
  socket.on('message:send', async ({ conversationId, body, attachment, tempId }) => {
    try {
      console.log('[socket] message:send received', {
        conversationId,
        body,
        attachment,
        user: socket.userId,
      });

      if (!conversationId || (!body && !attachment)) {
        console.log('[socket] missing data, abort');
        return;
      }

      const convo = await Conversation.findById(conversationId);

      // 1. אם השיחה לא קיימת בכלל – עוצרים
      if (!convo) {
        console.log('[socket] conversation not found, abort', {
          conversationId,
        });
        return;
      }

      // 2. אם המשתמש לא מופיע ברשימת המשתתפים – רק מזהירים, אבל ממשיכים
      const isParticipant = convo.participants
        .map((id) => String(id))
        .includes(socket.userId);

      if (!isParticipant) {
        console.warn(
          '[socket] WARNING: user not in participants array, but continuing anyway',
          {
            conversationId,
            userId: socket.userId,
            participants: convo.participants.map(String),
          }
        );
      }

      const participants = convo.participants.map((id) => String(id));

      // יצירת הודעה ב־DB
      const msgData = { conversation: conversationId, sender: socket.userId };
      if (body) msgData.body = body;
      if (attachment) msgData.attachment = attachment;
      const msg = await Message.create(msgData);

      convo.lastMessageAt = new Date();
      await convo.save();

      const payloadDoc = await Message.findById(msg._id).populate(
        'sender',
        'username displayName email'
      );
      const payload = payloadDoc && payloadDoc.toObject ? payloadDoc.toObject() : payloadDoc;
      // include the client's tempId so the client can reconcile optimistic messages
      if (tempId) payload._tempId = tempId;

      console.log('[socket] message saved & emitting', {
        msgId: msg._id.toString(),
        conversationId,
        participants,
      });

      // 1) message:new לכל מי שנמצא כרגע בחדר של השיחה
      io.to(convoRoom(conversationId)).emit('message:new', payload);

      // 2) conversation:update – לכל המשתתפים (עדכון רשימת שיחות / באדג')
      participants.forEach((uid) => {
        io.to(userRoom(uid)).emit('conversation:update', {
          conversationId,
          lastMessage: payload,
        });
      });
    } catch (err) {
      console.error('[socket] message:send error', err);
    }
  });

  // Typing event
  socket.on('typing', ({ conversationId, isTyping }) => {
    io.to(convoRoom(conversationId)).emit('typing', {
      userId: socket.userId,
      conversationId,
      isTyping,
    });
  });

  // Read messages
  socket.on('messages:read', async ({ conversationId, messageIds }) => {
    const convo = await Conversation.findById(conversationId);

    if (
      !convo ||
      !convo.participants.map(String).includes(socket.userId)
    )
      return;

    const filter = {
      conversation: conversationId,
      sender: { $ne: socket.userId },
    };

    if (Array.isArray(messageIds) && messageIds.length)
      filter._id = { $in: messageIds };

    await Message.updateMany(filter, {
      $addToSet: { readBy: socket.userId },
    });

    io.to(convoRoom(conversationId)).emit('messages:read', {
      conversationId,
      userId: socket.userId,
      messageIds: messageIds || null,
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: false,
      lastSeenAt: new Date(),
    }).exec();

    socket.broadcast.emit('user:offline', { userId: socket.userId });
  });
}
