import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
