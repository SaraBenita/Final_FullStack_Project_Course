import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  email:    { type: String, required: true, unique: true, index: true },
  displayName: { type: String },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeenAt: { type: Date }
}, { timestamps: true });
export default mongoose.model('User', UserSchema);
