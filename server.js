const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket']
});
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const words = [
  'lion', 'elephant', 'giraffe', 'shark', 'panda', 'eagle', 'snake', 'dolphin', 'kangaroo', 'octopus',
  'chair', 'lamp', 'bicycle', 'clock', 'umbrella', 'camera', 'guitar', 'backpack', 'scissors', 'rocket',
  'pizza', 'sushi', 'burger', 'ice cream', 'taco', 'donut', 'watermelon', 'spaghetti', 'cupcake', 'avocado',
  'castle', 'beach', 'mountain', 'forest', 'city', 'volcano', 'lighthouse', 'pyramid', 'bridge', 'stadium',
  'running', 'dancing', 'swimming', 'painting', 'singing', 'jumping', 'cooking', 'reading', 'flying', 'surfing',
  'sun', 'moon', 'rainbow', 'cloud', 'waterfall', 'tree', 'flower', 'cactus', 'glacier', 'comet',
  'car', 'airplane', 'train', 'boat', 'helicopter', 'submarine', 'tractor', 'skateboard', 'hot air balloon', 'scooter',
  'love', 'fear', 'dream', 'music', 'laughter', 'puzzle', 'shadow', 'hope', 'chaos', 'victory',
  'computer', 'smartphone', 'robot', 'drone', 'keyboard', 'satellite', 'VR headset', '3D printer',
  'crown', 'map', 'compass', 'telescope', 'anchor', 'kite', 'campfire', 'snowflake', 'dragon', 'wizard'
];

let players = [];
let currentDrawerIndex = 0;
let currentWord = '';
let gameInterval = null;

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function startNewRound() {
  if (players.length < 2) return;
  currentDrawerIndex = (currentDrawerIndex + 1) % players.length; // Cycle through players
  const currentDrawer = players[currentDrawerIndex];
  currentWord = getRandomWord();
  io.emit('newRound', { drawer: currentDrawer, word: currentWord });
  gameInterval = setTimeout(startNewRound, 60000);
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (username) => {
    console.log(`Join event received for username: ${username}`);
    const player = { id: socket.id, username, score: 0 };
    players.push(player);
    socket.emit('playerList', players);
    io.emit('message', `${username} joined the game!`);
    socket.broadcast.emit('playerList', players);
    if (players.length === 2 && currentDrawerIndex === 0) startNewRound();
  });

  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  socket.on('guess', (guess) => {
    io.emit('message', `${players.find(p => p.id === socket.id).username}: ${guess}`);
    if (guess.toLowerCase() === currentWord.toLowerCase() && socket.id !== players[currentDrawerIndex].id) {
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
      if (players.length < 2) {
        clearTimeout(gameInterval);
        currentDrawerIndex = 0;
      } else if (players[currentDrawerIndex]?.id === socket.id) {
        currentDrawerIndex = currentDrawerIndex % players.length;
        clearTimeout(gameInterval);
        startNewRound();
      } else {
        currentDrawerIndex = currentDrawerIndex % players.length;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;