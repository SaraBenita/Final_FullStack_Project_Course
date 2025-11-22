import { create } from 'zustand';
import api from './api';
import { connectSocket, getSocket, disconnectSocket } from './socket';

const useStore = create((set, get) => ({
  me: null,
  conversations: [],
  users: [],
  activeConversationId: null,
  messages: [],
  typingUsers: {},
  banner: null,
  _booted: false,
  unreadByConvo: {},

  setBanner: (banner) => set({ banner }),

  setActiveConversation: async (id) => {
    const current = get().activeConversationId;
    const socket = connectSocket();

    if (current && current !== id) {
      socket.emit('conversation:leave', current);
    }

    set({ activeConversationId: id, messages: [] });

    set({
      unreadByConvo: {
        ...get().unreadByConvo,
        [id]: 0,
      },
    });

    socket.emit('conversation:join', id);

    try {
      const { data } = await api.get(`/api/messages/${id}`);
      set({ messages: data });

      // סימון כנקראו בצד השרת
      const myId = get().me?.id;
      const unread = data
        .filter(
          (m) =>
            (m.sender?._id || m.sender) !== myId &&
            !(m.readBy || []).includes(myId)
        )
        .map((m) => m._id);

      if (unread.length) {
        socket.emit('messages:read', {
          conversationId: id,
          messageIds: unread,
        });
        get().markReadClientSide(unread);
      }
    } catch (e) {
      set({
        banner: { type: 'error', text: 'Failed loading messages' },
      });
    }
  },

  boot: async () => {
    if (get()._booted) return;
    set({ _booted: true });

    try {
      const me = await api
        .get('/api/auth/me')
        .then((r) => r.data)
        .catch(() => null);

      if (!me) {
        set({
          banner: {
            type: 'error',
            text: 'Not authenticated. Please login.',
          },
        });
        return;
      }

      set({ me: { ...me, id: me.id || me._id } });

      const [usersRes, convRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/conversations'),
      ]);

      set({
        users: usersRes.data,
        conversations: convRes.data,
        banner: null,
      });
    } catch (e) {
      set({
        banner: { type: 'error', text: 'Failed loading data' },
      });
    }

    const socket = connectSocket();

    socket.off('message:new');
    socket.off('typing');
    socket.off('messages:read');
    socket.off('conversation:new');
    socket.off('conversation:update');
    socket.off('conversation:updated');
    socket.off('user:created');
    socket.off('user:online');
    socket.off('user:offline');


    socket.on('message:new', (msg) => {
      const active = get().activeConversationId;
      console.log('[message:new] got msg', msg, 'active =', active);

      if (String(msg.conversation) === String(active)) {
        if (msg._tempId) {
          const list = [...get().messages];
          const idx = list.findIndex((m) => m._id === msg._tempId);
          if (idx >= 0) {
            list[idx] = msg;
            set({ messages: list });
          } else {
            const exists = list.some((m) => m._id === msg._id);
            if (!exists) set({ messages: [...list, msg] });
          }
        } else {
          const exists = get().messages.some((m) => m._id === msg._id);
          if (!exists) {
            set({ messages: [...get().messages, msg] });
          }
        }
      }

      const list = get().conversations;
      const idx = list.findIndex(
        (c) => String(c._id) === String(msg.conversation)
      );
      if (idx >= 0) {
        const updated = [...list];
        const old = updated[idx];
        const updatedConvo = {
          ...old,
          lastMessageAt: msg.createdAt || new Date().toISOString(),
          lastMessage: msg,
        };
        updated.splice(idx, 1);
        updated.unshift(updatedConvo);
        set({ conversations: updated });
      }
    });

    socket.on('typing', ({ userId, conversationId, isTyping }) => {
      if (conversationId !== get().activeConversationId) return;
      set((s) => ({
        typingUsers: { ...s.typingUsers, [userId]: isTyping },
      }));
    });


    socket.on('messages:read', ({ conversationId, userId, messageIds }) => {
      if (conversationId !== get().activeConversationId) return;

      set({
        messages: get().messages.map((m) => {
          if (messageIds && !messageIds.includes(m._id)) return m;
          if ((m.readBy || []).includes(userId)) return m;
          return {
            ...m,
            readBy: [...(m.readBy || []), userId],
          };
        }),
      });
    });

    socket.on('conversation:new', (convo) => {
      const exists = get().conversations.some((c) => c._id === convo._id);
      if (!exists) {
        set({ conversations: [convo, ...get().conversations] });
      }
    });


    socket.on('conversation:update', ({ conversationId, lastMessage }) => {
      const list = get().conversations;
      const idx = list.findIndex(
        (c) => String(c._id) === String(conversationId)
      );
      if (idx >= 0) {
        const updated = [...list];
        const old = updated[idx];
        const newConvo = {
          ...old,
          lastMessageAt:
            lastMessage?.createdAt || new Date().toISOString(),
          lastMessage,
        };
        updated[idx] = newConvo;
        updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
        set({ conversations: updated });

        if (String(conversationId) !== String(get().activeConversationId)) {
          const unread = { ...get().unreadByConvo };
          unread[conversationId] = (unread[conversationId] || 0) + 1;
          set({ unreadByConvo: unread });
        }
      }
    });


    socket.on('conversation:updated', (convo) => {
      const updated = get().conversations.map((c) =>
        c._id === convo._id ? convo : c
      );
      set({ conversations: updated });
    });


    socket.on('user:created', () => {
      api
        .get('/api/users')
        .then((r) => set({ users: r.data }))
        .catch(() => { });
    });


    socket.on('user:online', ({ userId }) => {
      set({
        users: get().users.map((u) =>
          String(u._id) === String(userId) ? { ...u, isOnline: true } : u
        ),
      });
    });

    socket.on('user:offline', ({ userId }) => {
      set({
        users: get().users.map((u) =>
          String(u._id) === String(userId) ? { ...u, isOnline: false } : u
        ),
      });
    });
  },


  login: async (username, password) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        username,
        password,
      });
      localStorage.setItem('token', data.token);
      set({
        me: { ...data.user, id: data.user.id || data.user._id },
        banner: { type: 'success', text: 'Logged in' },
      });
      await get().boot();
    } catch (e) {
      const reason = e?.response?.data?.reason;
      const msg = e?.response?.data?.message;
      let human = msg || 'Login failed.';
      if (reason === 'user_not_found')
        human = 'User not found. Please register first.';
      if (reason === 'bad_password')
        human = 'Wrong password. Please try again.';
      set({ banner: { type: 'error', text: human } });
    }
  },

  register: async (username, email, password) => {
    try {
      const { data } = await api.post('/api/auth/register', {
        username,
        email,
        password,
      });
      localStorage.setItem('token', data.token);
      set({
        me: { ...data.user, id: data.user.id || data.user._id },
        banner: {
          type: 'success',
          text: 'Registered & logged in',
        },
      });
      await get().boot();
    } catch (e) {
      const reason = e?.response?.data?.reason;
      const msg =
        e?.response?.data?.message || 'Registration failed';
      let human = msg;
      if (reason === 'email_exists')
        human = 'Email already exists. Please login instead.';
      if (reason === 'username_exists')
        human = 'Username taken. Choose another.';
      set({ banner: { type: 'error', text: human } });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      me: null,
      conversations: [],
      users: [],
      activeConversationId: null,
      messages: [],
      _booted: false,
      banner: { type: 'success', text: 'Logged out' },
      unreadByConvo: {},
    });
    disconnectSocket();
  },


  createConversation: async (participantIds, isGroup = false, name = '') => {
    try {
      const { data } = await api.post('/api/conversations', {
        participantIds,
        isGroup,
        name,
      });
      const exists = get().conversations.some((c) => c._id === data._id);
      const newList = exists
        ? get().conversations
        : [data, ...get().conversations];
      set({
        conversations: newList,
        banner: {
          type: 'success',
          text: isGroup ? 'Group ready' : 'Chat ready',
        },
      });
      await get().setActiveConversation(data._id);
    } catch (e) {
      const reason = e?.response?.data?.reason;
      if (reason === 'group_name_exists') {
        set({
          banner: {
            type: 'error',
            text: 'Group name already exists. Choose another.',
          },
        });
      } else {
        set({
          banner: { type: 'error', text: 'Failed creating conversation' },
        });
      }
    }
  },


  sendMessage: async (conversationId, body, attachment) => {
    const me = get().me;

    if (!conversationId || (!body && !attachment) || !me) {
      console.warn('Cannot send message – missing data', {
        conversationId,
        hasBody: !!body,
        me,
      });
      return;
    }

    const tempId = `local-${Date.now()}`;

    const optimisticMsg = {
      _id: tempId,
      conversation: conversationId,
      sender: {
        _id: me.id,
        username: me.username,
        displayName: me.displayName,
      },
      body,
      attachment,
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    set({ messages: [...get().messages, optimisticMsg] });

    const socket = connectSocket();
    socket.emit('message:send', { conversationId, body, attachment, tempId });
  },

  typing: (conversationId, isTyping) => {
    const socket = connectSocket();
    socket.emit('typing', { conversationId, isTyping });
  },

  markReadClientSide: (ids) => {
    const myId = get().me?.id;
    if (!myId || !ids?.length) return;

    set({
      messages: get().messages.map((m) =>
        ids.includes(m._id)
          ? { ...m, readBy: [...(m.readBy || []), myId] }
          : m
      ),
    });
  },
}));

export default useStore;
