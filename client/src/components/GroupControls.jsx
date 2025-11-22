import React, { useState } from 'react';
import useStore from '../store';
import api from '../api';

export default function GroupControls() {
  const users = useStore((s) => s.users);
  const conversations = useStore((s) => s.conversations);
  const setActiveConversation = useStore((s) => s.setActiveConversation);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const createGroup = async () => {
    if (selected.length < 2) {
      alert('יש לבחור לפחות שני משתמשים לקבוצה');
      return;
    }

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      alert('יש להזין שם קבוצה');
      return;
    }

    const existsLocally = conversations.some(
      (c) =>
        c.isGroup &&
        (c.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existsLocally) {
      alert('שם הקבוצה כבר קיים. אנא בחרי שם אחר.');
      return;
    }

    try {
      const { data } = await api.post('/api/conversations', {
        participantIds: selected,
        isGroup: true,
        name: trimmedName,
      });

      const convos = await api.get('/api/conversations').then((r) => r.data);
      useStore.setState({ conversations: convos });

      setActiveConversation(data._id);

      setSelected([]);
      setGroupName('');
    } catch (e) {
      const reason = e?.response?.data?.reason;
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;

      if (reason === 'group_name_exists' || (status === 400 && msg)) {
        alert('שם הקבוצה כבר קיים. אנא בחרי שם אחר.');
      } else {
        alert('יצירת הקבוצה נכשלה. נסי שוב.');
      }
    }
  };

  const renameGroup = async () => {
    const activeConversationId = useStore.getState().activeConversationId;
    if (!activeConversationId) {
      alert('יש לבחור קבוצה לשינוי שם');
      return;
    }

    const convo = conversations.find((c) => c._id === activeConversationId);
    if (!convo?.isGroup) {
      alert('שינוי שם אפשרי רק בקבוצה');
      return;
    }

    const newName = prompt('שם קבוצה חדש:', convo.name || '');
    if (!newName || !newName.trim()) {
      return;
    }

    const trimmed = newName.trim();

    const existsLocally = conversations.some(
      (c) =>
        c.isGroup &&
        c._id !== activeConversationId &&
        (c.name || '').trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existsLocally) {
      alert('שם הקבוצה כבר קיים. אנא בחרי שם אחר.');
      return;
    }

    try {
      await api.patch(`/api/conversations/${activeConversationId}`, {
        name: trimmed,
      });

      const convos = await api.get('/api/conversations').then((r) => r.data);
      useStore.setState({ conversations: convos });

      alert('שם הקבוצה עודכן בהצלחה');
    } catch (e) {
      const reason = e?.response?.data?.reason;
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;

      if (reason === 'group_name_exists' || (status === 400 && msg)) {
        alert('שם הקבוצה כבר קיים. אנא בחרי שם אחר.');
      } else {
        alert('שינוי שם הקבוצה נכשל. נסי שוב.');
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold mb-1">יצירת קבוצה</div>
        <input
          className="w-full border rounded-lg p-2 mb-2"
          placeholder="שם קבוצה"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <div className="max-h-40 overflow-auto border rounded-lg p-2">
          {users.map((u) => (
            <label key={u._id} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={selected.includes(u._id)}
                onChange={() => toggle(u._id)}
              />
              <span>{u.displayName || u.username}</span>
            </label>
          ))}
        </div>
        <button
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg"
          onClick={createGroup}
        >
          צור קבוצה
        </button>
      </div>

      <div className="pt-3 border-t">
        <button
          className="px-3 py-1 border rounded-lg"
          onClick={renameGroup}
        >
          שינוי שם קבוצה
        </button>
      </div>
    </div>
  );
}
