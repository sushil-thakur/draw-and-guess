const socket = io();
let isDrawing = false;
let isDrawer = false;
let username;
let timeLeft = 60;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const wordDisplay = document.getElementById('word-display');
const timerDisplay = document.getElementById('timer');
const chat = document.getElementById('chat');
const playerList = document.getElementById('player-list');
const guessInput = document.getElementById('guess-input');
const colorPicker = document.getElementById('color');
const colorPickerContainer = document.getElementById('color-picker');

function joinGame() {
  username = document.getElementById('username').value.trim();
  if (username) {
    socket.emit('join', username);
    document.getElementById('join-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
  }
}

function sendGuess() {
  const guess = guessInput.value.trim();
  if (guess) {
    socket.emit('guess', guess);
    guessInput.value = '';
  }
}

guessInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendGuess();
});

canvas.addEventListener('mousedown', () => {
  if (isDrawer) isDrawing = true;
});

canvas.addEventListener('mouseup', () => {
  isDrawing = false;
  ctx.beginPath();
});

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing && isDrawer) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    draw(x, y);
    socket.emit('draw', { x, y, color: colorPicker.value });
  }
});

colorPicker.addEventListener('change', () => {
  ctx.strokeStyle = colorPicker.value;
});

function draw(x, y, color = ctx.strokeStyle) {
  ctx.strokeStyle = color;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function startTimer() {
  timeLeft = 60;
  timerDisplay.textContent = `Time: ${timeLeft}s`;
  const timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

socket.on('playerList', (players) => {
  playerList.innerHTML = players.map(p => `<li>${p.username}: ${p.score}</li>`).join('');
  if (players.length < 2) {
    wordDisplay.textContent = 'Waiting for more players...';
    timerDisplay.textContent = '';
  }
});

socket.on('message', (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  chat.appendChild(li);
  chat.scrollTop = chat.scrollHeight;
});

socket.on('newRound', ({ drawer, word }) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  isDrawer = drawer.id === socket.id;
  wordDisplay.textContent = isDrawer ? `Word: ${word}` : 'Guess the word!';
  colorPickerContainer.style.display = isDrawer ? 'block' : 'none';
  canvas.style.pointerEvents = isDrawer ? 'auto' : 'none';
  canvas.classList.toggle('active', isDrawer);
  startTimer();
});

socket.on('draw', ({ x, y, color }) => {
  draw(x, y, color);
});

socket.on('correctGuess', () => {
  triggerConfetti();
});

ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';