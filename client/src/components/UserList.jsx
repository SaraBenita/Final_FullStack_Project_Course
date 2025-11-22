import React from 'react'; import useStore from '../store';
export default function UserList(){
  const users=useStore(s=>s.users); const createConversation=useStore(s=>s.createConversation);
  return (
    <div className="space-y-2">
      {users.map(u=>(
        <div key={u._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
          <div><div className="font-medium">{u.displayName||u.username}</div><div className="text-xs text-gray-500">{u.isOnline?'Online':'Offline'}</div></div>
          <button className="text-sm px-2 py-1 border rounded-lg" onClick={()=>createConversation([u._id], false)}>Chat</button>
        </div>
      ))}
    </div>
  );
}
