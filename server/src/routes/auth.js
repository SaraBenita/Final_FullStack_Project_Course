import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config.js';
import { authRequired } from '../middleware/auth.js';
const router=Router();

router.post('/register', async (req,res)=>{
  const { username, email, password } = req.body;
  if(!username || !email || !password) return res.status(400).json({ message:'username, email & password required' });
  const [existsName, existsEmail] = await Promise.all([ User.findOne({username}), User.findOne({email}) ]);
  if(existsEmail) return res.status(409).json({ message:'Email already exists. Please login.', reason:'email_exists' });
  if(existsName) return res.status(409).json({ message:'Username already taken. Choose another.', reason:'username_exists' });
  const passwordHash = await bcrypt.hash(password,10);
  const user = await User.create({ username, email, displayName: username, passwordHash });
  const token = jwt.sign({ id:user._id }, JWT_SECRET, { expiresIn:'7d' });
  req.io?.emit('user:created', { _id: user._id, username, email, displayName: user.displayName });
  res.status(201).json({ token, user: { _id:user._id, id:user._id, username, email, displayName: user.displayName } });
});

router.post('/login', async (req,res)=>{
  const { username, password } = req.body;
  const user=await User.findOne({ username });
  if(!user) return res.status(404).json({ message:'User not found. Please register.', reason:'user_not_found' });
  const ok=await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ message:'Wrong password. Please try again.', reason:'bad_password' });
  const token=jwt.sign({ id:user._id }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user: { _id:user._id, id:user._id, username:user.username, email:user.email, displayName:user.displayName } });
});

router.get('/me', authRequired, async (req,res)=>{
  const u=await User.findById(req.user.id);
  if(!u) return res.status(404).json({ message:'user not found' });
  res.json({ _id:u._id, id:u._id, username:u.username, email:u.email, displayName:u.displayName });
});

export default router;
