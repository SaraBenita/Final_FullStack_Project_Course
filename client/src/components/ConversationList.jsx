import React from 'react';
import useStore from '../store';
function titleFor(convo, meId){ if(convo.isGroup) return convo.name||'Group'; const other=(convo.participants||[]).find(p=>String(p._id)!==String(meId)); return other?(other.displayName||other.username):'Direct chat'; }
export default function ConversationList(){
  const conversations=useStore(s=>s.conversations);
  const unreadByConvo=useStore(s=>s.unreadByConvo);
  const activeConversationId=useStore(s=>s.activeConversationId);
  const setActiveConversation=useStore(s=>s.setActiveConversation);
  const me=useStore(s=>s.me);
  return (
    <div className="space-y-2">
      {conversations.map(c=>(
        <button key={c._id} onClick={()=>setActiveConversation(c._id)} className={`w-full text-left px-3 py-2 rounded-lg ${activeConversationId===c._id?'bg-blue-100':'hover:bg-gray-100'}`}>
          <div className="font-semibold flex items-center justify-between">
            <span>{titleFor(c, me?.id)}</span>
            {unreadByConvo[c._id]>0 && (<span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{unreadByConvo[c._id]}</span>)}
          </div>
          <div className="text-xs text-gray-500">{c.participants?.length} participants</div>
        </button>
      ))}
    </div>
  );
}
