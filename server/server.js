// Логика обработки подключения через сокеты
io.on("connection", async (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  // Подключение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      // Если комнаты нет в базе данных, создаем новую
      room = new Room({
        roomId,
        users: [{ username, socketId: socket.id }],
        chat: []
      });
      await room.save();  // Сохраняем в базу данных
    } else {
      // Если комната существует, добавляем пользователя
      room.users.push({ username, socketId: socket.id });
      await room.save();  // Обновляем данные в базе данных
    }

    socket.join(roomId);  // Пользователь присоединился к комнате
    io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
    socket.emit("chat-history", room.chat);  // Отправляем историю чата клиенту
  });

  // Обработка отправки сообщений
  socket.on("chat-message", async (data) => {
    const { roomId, message, username, timestamp } = data;
    let room = await Room.findOne({ roomId });

    if (room) {
      room.chat.push({ username, message, timestamp });
      await room.save();  // Сохраняем сообщение в базе данных
      io.to(roomId).emit("chat-message", { username, message, timestamp });  // Отправляем сообщение всем в комнате
    }
  });

  // Выход пользователя из комнаты
  socket.on("leave-room", async (roomId) => {
    let room = await Room.findOne({ roomId });

    if (room) {
      room.users = room.users.filter(user => user.socketId !== socket.id);
      await room.save();  // Обновляем список пользователей в базе данных
      io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
    }

    socket.leave(roomId);
  });

  // Отключение пользователя
  socket.on("disconnect", async () => {
    for (let roomId in rooms) {
      let room = await Room.findOne({ roomId });
      if (room) {
        room.users = room.users.filter(user => user.socketId !== socket.id);
        if (room.users.length === 0) {
          await Room.deleteOne({ roomId });  // Удаляем комнату, если в ней больше нет пользователей
        } else {
          await room.save();  // Сохраняем изменения в базе данных
        }
        io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
      }
    }
  });
});
