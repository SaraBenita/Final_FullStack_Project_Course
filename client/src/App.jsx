import React, { useEffect } from 'react';
import AuthForm from './components/AuthForm.jsx';
import ChatLayout from './components/ChatLayout.jsx';
import useStore from './store';
import api from './api';

export default function App(){
  const me = useStore(s => s.me);
  const setBanner = useStore(s => s.setBanner);
  const banner = useStore(s => s.banner);

  useEffect(()=>{
    const t = localStorage.getItem('token');
    if (!t) return;
    api.get('/api/auth/me')
      .then(r => { useStore.setState({ me: { ...r.data, id: r.data.id || r.data._id } }); setBanner(null); })
      .catch(()=>{ localStorage.removeItem('token'); setBanner({ type:'error', text:'Session expired. Please login again.'}); });
  },[]);

  return (
    <div>
      {banner && <div className={`alert ${banner.type==='error'?'error':'success'} mx-4 my-2`}>{banner.text}</div>}
      {me ? <ChatLayout /> : <AuthForm />}
    </div>
  );
}
