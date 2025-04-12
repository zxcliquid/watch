const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  users: [{ username: String, socketId: String }],
  chat: [
    {
      username: String,
      message: String,
      timestamp: String,
    },
  ],
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;