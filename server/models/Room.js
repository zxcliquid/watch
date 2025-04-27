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
  videoId: { type: String, default: "dQw4w9WgXcQ" }, // <--- добавьте это!
  videoTime: { type: Number, default: 0 },
  playerType: { type: String, default: "youtube" },
  twitchChannel: { type: String, default: "" }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;