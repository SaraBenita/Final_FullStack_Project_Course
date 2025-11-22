import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export function authRequired(req,res,next){
  const hdr=req.headers.authorization||'';
  const token=hdr.startsWith('Bearer ')?hdr.slice(7):null;
  if(!token) 
    return res.status(401).json({ message:'Missing token' });
  try{ const payload=jwt.verify(token,JWT_SECRET); req.user={ id:String(payload.id) }; next(); }
  catch(e){ return res.status(401).json({ message:'Invalid token' }); }
}
