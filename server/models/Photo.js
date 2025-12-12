import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  roomName: {
    type: String,
    required: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Photo = mongoose.model('Photo', photoSchema);

export default Photo;
