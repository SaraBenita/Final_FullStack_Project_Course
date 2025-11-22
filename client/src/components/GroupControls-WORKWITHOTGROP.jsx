import React,{useState} from 'react'; import useStore from '../store'; import api from '../api';
export default function GroupControls(){
  const users=useStore(s=>s.users); const conversations=useStore(s=>s.conversations); const activeConversationId=useStore(s=>s.activeConversationId); const setActiveConversation=useStore(s=>s.setActiveConversation);
  const [selected,setSelected]=useState([]); const [groupName,setGroupName]=useState('');
  const toggle=(id)=> setSelected(prev=> prev.includes(id)? prev.filter(x=>x!==id): [...prev,id]);
  const createGroup=async()=>{ if(selected.length<2) return alert('בחרי לפחות שני משתתפים לקבוצה'); const {data}=await api.post('/api/conversations',{participantIds:selected,isGroup:true,name:groupName||'New Group'}); await setActiveConversation(data._id); setSelected([]); setGroupName(''); };
  const renameGroup=async()=>{
    if(!activeConversationId) return; const convo=conversations.find(c=>c._id===activeConversationId); if(!convo?.isGroup) return alert('שינוי שם אפשרי רק בקבוצה');
    const newName=prompt('שם קבוצה חדש:', convo.name||''); if(!newName) return; await api.patch(`/api/conversations/${activeConversationId}`,{name:newName}); const {data}=await api.get('/api/conversations'); useStore.setState({ conversations:data });
  };
  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold mb-1">יצירת קבוצה</div>
        <input className="w-full border rounded-lg p-2 mb-2" placeholder="שם קבוצה" value={groupName} onChange={e=>setGroupName(e.target.value)} />
        <div className="max-h-40 overflow-auto border rounded-lg p-2">
          {users.map(u=> (
            <label key={u._id} className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={selected.includes(u._id)} onChange={()=>toggle(u._id)} />
              <span>{u.displayName||u.username}</span>
            </label>
          ))}
        </div>
        <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg" onClick={createGroup}>צור קבוצה</button>
      </div>
      <div className="pt-3 border-t">
        <button className="px-3 py-1 border rounded-lg" onClick={renameGroup}>שינוי שם קבוצה</button>
      </div>
    </div>
  );
}
