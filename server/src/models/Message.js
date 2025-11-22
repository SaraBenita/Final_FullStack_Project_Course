import mongoose from 'mongoose';
const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String },
  attachment: {
    url: { type: String },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number }
  },
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
MessageSchema.index({ conversation: 1, createdAt: 1 });
export default mongoose.model('Message', MessageSchema);
