import React, { useEffect, useRef, useState } from 'react'; import useStore from '../store'; import { connectSocket } from '../socket';
function Ticks({ mine, deliveredTo = [], readBy = [], participants = [] }) {
  if (!mine) return null; const othersCount = (participants?.length || 1) - 1; const isReadByAll = readBy?.length >= othersCount && othersCount > 0; const isDelivered = (deliveredTo?.length || 0) >= othersCount && othersCount > 0;
  return <span className="ml-2 text-xs text-gray-500">{isReadByAll ? '✓✓' : (isDelivered ? '✓' : '')}</span>;
}
export default function MessageList() {
  const messages = useStore(s => s.messages); const me = useStore(s => s.me); const activeConversationId = useStore(s => s.activeConversationId); const conversations = useStore(s => s.conversations); const markReadClientSide = useStore(s => s.markReadClientSide);
  const bottomRef = useRef(null); const alreadyMarkedRef = useRef(new Set());
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (!activeConversationId || !me?.id) return;
    const unreadIds = messages.filter(m => (m.sender?._id || m.sender) !== me.id && !(m.readBy || []).includes(me.id) && !alreadyMarkedRef.current.has(m._id)).map(m => m._id);
    if (unreadIds.length) { const socket = connectSocket(); socket.emit('messages:read', { conversationId: activeConversationId, messageIds: unreadIds }); unreadIds.forEach(id => alreadyMarkedRef.current.add(id)); markReadClientSide(unreadIds); }
  }, [activeConversationId, messages, me?.id, markReadClientSide]);
  useEffect(() => { alreadyMarkedRef.current = new Set(); }, [activeConversationId]);
  const participants = conversations.find(c => c._id === activeConversationId)?.participants || [];
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
      {messages.map(m => {
        const mine = (m.sender?._id || m.sender) === me?.id; const senderName = m.sender?.displayName || m.sender?.username || (mine ? 'Me' : 'Them');
        return (
          <div key={m._id} className={`max-w-[70%] ${mine ? 'ml-auto text-right' : ''}`}>
            {!mine && <div className="text-xs text-gray-500 mb-1">{senderName}</div>}
            <span className={`bubble ${mine ? 'me' : 'other'}`}>
              {m.attachment && m.attachment.mimeType && m.attachment.mimeType.startsWith('image/') ? (
                <div className="relative inline-block">
                  <ImageWithFallback src={m.attachment.url} alt={m.attachment.filename} className="max-w-[60%] max-h-[400px] rounded" />
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const res = await fetch(m.attachment.url);
                        if (!res.ok) throw new Error('Failed fetching file');
                        const blob = await res.blob();
                        const objUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = objUrl;
                        a.download = m.attachment.filename || 'image';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(objUrl);
                      } catch (err) {
                        console.error('Download failed', err);
                      }
                    }}
                    className="absolute top-1 right-1 bg-white bg-opacity-90 p-1 rounded shadow text-xs text-black"
                    aria-label="Download image"
                  >
                    הורד
                  </button>
                </div>
              ) : m.attachment ? (
                <a href={m.attachment.url} target="_blank" rel="noreferrer" className="text-blue-600" download>
                  {m.attachment.filename || 'Download file'}
                </a>
              ) : (
                m.body
              )}
              <Ticks mine={mine} deliveredTo={m.deliveredTo} readBy={m.readBy} participants={participants} />
            </span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function ImageWithFallback({ src, alt, className }) {
  const [cur, setCur] = useState(src);
  const [failed, setFailed] = useState(false);

  const handleError = async () => {
    if (failed) return;
    setFailed(true);
    try {
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) return;
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setCur(objUrl);
    } catch (e) {
      // ignore fallback failure
    }
  };

  return (
    <a href={src} target="_blank" rel="noreferrer" className="inline-block">
      <img src={cur} alt={alt} className={className} onError={handleError} />
    </a>
  );
}
