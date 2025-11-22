import { Router } from 'express';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
const router=Router();
router.get('/', authRequired, async (req,res)=>{
  const users=await User.find({},'username displayName email isOnline lastSeenAt');
  res.json(users.filter(u=>String(u._id)!==req.user.id));
});
export default router;
