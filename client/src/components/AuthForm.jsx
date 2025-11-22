import React,{useState} from 'react';
import useStore from '../store';
export default function AuthForm(){
  const [mode,setMode]=useState('login');
  const [username,setUsername]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const login=useStore(s=>s.login); const register=useStore(s=>s.register);
  const submit=async(e)=>{ e.preventDefault(); if(mode==='login') await login(username,password); else await register(username,email,password); };
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Chatico</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded-lg p-3" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
          {mode==='register' && <input className="w-full border rounded-lg p-3" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />}
          <input type="password" className="w-full border rounded-lg p-3" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold">{mode==='login'?'Login':'Register'}</button>
        </form>
        <div className="text-sm mt-4 text-center">
          {mode==='login' ? (<button className="text-blue-600" onClick={()=>setMode('register')}>Create an account</button>)
                           : (<button className="text-blue-600" onClick={()=>setMode('login')}>Already have an account? Login</button>)}
        </div>
      </div>
    </div>
  );
}
