'use strict';

const WebSocket = require('ws');

// Start a standalone WebSocket server on port 5000
const wss = new WebSocket.Server({ port: 5000 });
console.log('WebSocket server listening on ws://localhost:5000');

// In-memory online users: userId -> last status message
const onlineUsers = new Map();

/**
 * Low-level broadcast: send a JSON string to all open clients
 */
function rawBroadcast(payload) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * High-level broadcast: update onlineUsers, then send to all clients
 * This is what we expose as global.wssBroadcast so HTTP routes stay in sync.
 */
function broadcastAndTrack(messageObj) {
  if (!messageObj || !messageObj.typeMessage) return;

  const { typeMessage, userId } = messageObj;

  if (typeMessage === 'login' || typeMessage === 'update') {
    onlineUsers.set(userId, messageObj);
  } else if (typeMessage === 'logout') {
    onlineUsers.delete(userId);
  }

  const payload = JSON.stringify(messageObj);
  rawBroadcast(payload);
}

// Make it available globally to other files (e.g., index.js routes)
global.wssBroadcast = broadcastAndTrack;

// Per-connection handlers
wss.on('connection', (ws) => {
  console.log('WS client connected');

  // Immediately send the current status of all online users
  const snapshot = Array.from(onlineUsers.values());
  ws.send(JSON.stringify(snapshot));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('WS received:', msg);

      // Only handle our protocol messages
      if (!msg || !msg.typeMessage) return;

      // Reuse the same logic used by HTTP routes
      broadcastAndTrack(msg);
    } catch (err) {
      console.error('Bad WS message', err);
    }
  });

  ws.on('close', () => {
    console.log('WS client disconnected');
    // (optional) you could track ws.userId and auto-logout here
  });

  ws.on('error', (err) => {
    console.error('WS error on client', err);
  });
});

// Nothing to export for now; just requiring this file starts the WS server.
module.exports = {};

