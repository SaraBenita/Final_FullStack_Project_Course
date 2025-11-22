import mongoose from 'mongoose';
const ConversationSchema = new mongoose.Schema({
  isGroup:{ type:Boolean, default:false },
  name:{ type:String },
  participants:[{ type:mongoose.Schema.Types.ObjectId, ref:'User', index:true }],
  lastMessageAt:{ type:Date }
},{ timestamps:true });
ConversationSchema.index({ participants:1, updatedAt:-1 });
ConversationSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isGroup: true, name: { $type: 'string' } } }
);
export default mongoose.model('Conversation', ConversationSchema);
