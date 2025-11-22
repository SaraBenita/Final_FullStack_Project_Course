import React,{useEffect,useRef} from 'react';
import ConversationList from './ConversationList.jsx'; import UserList from './UserList.jsx'; import GroupControls from './GroupControls.jsx';
import MessageList from './MessageList.jsx'; import MessageInput from './MessageInput.jsx'; import useStore from '../store';
export default function ChatLayout(){
  const boot=useStore(s=>s.boot); const logout=useStore(s=>s.logout); const activeConversationId=useStore(s=>s.activeConversationId); const typingUsers=useStore(s=>s.typingUsers); const me=useStore(s=>s.me);
  const booted=useRef(false);
  useEffect(()=>{ if(!booted.current){ booted.current=true; boot(); } },[boot]);
  return (
    <div className="min-h-screen grid grid-cols-[320px_1fr]">
      <aside className="p-4 border-r bg-white space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Chats</h2>
          <button className="text-sm text-red-600" onClick={logout}>Logout</button>
        </div>
        <div className="text-xs text-gray-500">Signed in as <span className="font-medium">{me?.displayName || me?.username}</span>{me?.email ? ` (${me.email})` : ''}</div>
        <ConversationList />
        <div className="pt-4 border-t"><h3 className="font-semibold mb-2">Users</h3><UserList /></div>
        <div className="pt-4 border-t"><h3 className="font-semibold mb-2">Groups</h3><GroupControls /></div>
      </aside>
      <main className="flex flex-col">
        <div className="p-4 border-b bg-white">
          {activeConversationId ? (<div className="text-sm text-gray-600">{Object.values(typingUsers).some(Boolean)?'מישהו מקליד…':'התחילי שיחה 👋'}</div>) : (<div className="text-sm text-gray-600">בחרי שיחה</div>)}
        </div>
        <MessageList />
        {activeConversationId && <MessageInput />}
      </main>
    </div>
  );
}
