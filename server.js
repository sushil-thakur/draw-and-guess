const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const words = ['cat', 'dog', 'house', 'tree', 'car', 'apple', 'book'];
let players = [];
let currentDrawer = null;
let currentWord = '';
let gameInterval = null;

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function startNewRound() {
  if (players.length < 2) return;
  currentDrawer = players[Math.floor(Math.random() * players.length)];
  currentWord = getRandomWord();
  io.emit('newRound', { drawer: currentDrawer, word: currentWord });
  gameInterval = setTimeout(startNewRound, 60000);
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (username) => {
    const player = { id: socket.id, username, score: 0 };
    players.push(player);
    socket.emit('playerList', players);
    io.emit('message', `${username} joined the game!`);
    socket.broadcast.emit('playerList', players);
    if (players.length === 2) startNewRound();
  });

  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  socket.on('guess', (guess) => {
    io.emit('message', `${players.find(p => p.id === socket.id).username}: ${guess}`);
    if (guess.toLowerCase() === currentWord.toLowerCase() && socket.id !== currentDrawer.id) {
      const player = players.find(p => p.id === socket.id);
      player.score += 10;
      io.emit('message', `${player.username} guessed correctly! +10 points`);
      io.emit('playerList', players);
      io.emit('correctGuess');
      clearTimeout(gameInterval);
      startNewRound();
    }
  });

  socket.on('disconnect', () => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      players = players.filter(p => p.id !== socket.id);
      io.emit('message', `${player.username} left the game.`);
      io.emit('playerList', players);
      if (currentDrawer && currentDrawer.id === socket.id) {
        clearTimeout(gameInterval);
        startNewRound();
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export for Vercel serverless functions
module.exports = app;