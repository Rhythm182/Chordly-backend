const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// rooms: { roomId: { users: Map<ws, {userId, userName}>, notes: [] } }
const rooms = {};

function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { users: new Map(), notes: [] };
  }
  return rooms[roomId];
}

function broadcast(room, message, excludeWs = null) {
  room.users.forEach((userInfo, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New client connected');
  let currentRoom = null;
  let currentUser = null;

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return;
    }

    // --- JOIN ROOM ---
    if (msg.type === 'join') {
      const room = getOrCreateRoom(msg.roomId);

      if (room.users.size >= 6) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 6)' }));
        return;
      }

      currentRoom = room;
      currentUser = { userId: msg.userId, userName: msg.userName };
      room.users.set(ws, currentUser);

      // Tell this user they joined successfully + send existing notes
      ws.send(JSON.stringify({
        type: 'joined',
        roomId: msg.roomId,
        userCount: room.users.size,
        recentNotes: room.notes.slice(-20),
      }));

      // Tell everyone else someone joined
      broadcast(room, {
        type: 'user_joined',
        userId: msg.userId,
        userName: msg.userName,
        userCount: room.users.size,
      }, ws);

      console.log(`${msg.userName} joined room ${msg.roomId} (${room.users.size}/6)`);
    }

    // --- PLAY NOTE ---
    if (msg.type === 'note') {
      if (!currentRoom) return;

      const noteEvent = {
        userId: currentUser.userId,
        userName: currentUser.userName,
        note: msg.note,       // e.g. "C4"
        timestamp: Date.now(),
      };

      currentRoom.notes.push(noteEvent);
      if (currentRoom.notes.length > 100) currentRoom.notes.shift(); // keep last 100

      // Broadcast to everyone else in room
      broadcast(currentRoom, { type: 'note', ...noteEvent }, ws);

      console.log(`${currentUser.userName} played ${msg.note}`);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUser) {
      currentRoom.users.delete(ws);
      broadcast(currentRoom, {
        type: 'user_left',
        userId: currentUser.userId,
        userName: currentUser.userName,
        userCount: currentRoom.users.size,
      });
      console.log(`${currentUser.userName} disconnected`);
    }
  });
});

app.get('/', (req, res) => res.send('Chordly backend running'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));