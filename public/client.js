// Initialize variables at the top
let username = '';
let isDrawing = false;
let isDrawer = false;
let timeLeft = 60;
let lastDrawTime = 0;
const DEBOUNCE_TIME = 50; // Debounce mousemove events (ms)

// Socket initialization (will work once Socket.IO script loads)
const socket = io({ transports: ['polling'] });

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const wordDisplay = document.getElementById('word-display');
const timerDisplay = document.getElementById('timer');
const chat = document.getElementById('chat');
const playerList = document.getElementById('player-list');
const guessInput = document.getElementById('guess-input');
const colorPicker = document.getElementById('color');
const colorPickerContainer = document.getElementById('color-picker');
const turnNotification = document.getElementById('turn-notification');

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
});
socket.on('connect_error', (err) => {
  console.log('Socket.IO connection error:', err.message);
});

function joinGame() {
  console.log('joinGame called');
  username = document.getElementById('username').value.trim();
  console.log('Username:', username);
  if (username) {
    console.log('Emitting join event');
    socket.emit('join', username);
    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
  } else {
    console.log('No username entered');
    alert('Please enter a username');
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

canvas.addEventListener('mousedown', (e) => {
  if (isDrawer) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    socket.emit('draw', { action: 'start', x, y, color: colorPicker.value });
  }
});

canvas.addEventListener('mouseup', () => {
  if (isDrawer && isDrawing) {
    isDrawing = false;
    ctx.beginPath();
    socket.emit('draw', { action: 'end' });
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing && isDrawer) {
    const now = Date.now();
    if (now - lastDrawTime < DEBOUNCE_TIME) return;
    lastDrawTime = now;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    draw({ action: 'move', x, y, color: colorPicker.value });
    socket.emit('draw', { action: 'move', x, y, color: colorPicker.value });
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (isDrawer) {
    e.preventDefault();
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    socket.emit('draw', { action: 'start', x, y, color: colorPicker.value });
  }
});

canvas.addEventListener('touchend', () => {
  if (isDrawer && isDrawing) {
    isDrawing = false;
    ctx.beginPath();
    socket.emit('draw', { action: 'end' });
  }
});

canvas.addEventListener('touchmove', (e) => {
  if (isDrawing && isDrawer) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastDrawTime < DEBOUNCE_TIME) return;
    lastDrawTime = now;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    draw({ action: 'move', x, y, color: colorPicker.value });
    socket.emit('draw', { action: 'move', x, y, color: colorPicker.value });
  }
});

colorPicker.addEventListener('change', () => {
  ctx.strokeStyle = colorPicker.value;
});

function draw(data) {
  if (data.action === 'start') {
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
    ctx.strokeStyle = data.color;
  } else if (data.action === 'move') {
    ctx.strokeStyle = data.color;
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  } else if (data.action === 'end') {
    ctx.beginPath();
  }
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
  console.log('Player list received:', players);
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
  colorPickerContainer.classList.toggle('hidden', !isDrawer);
  canvas.style.pointerEvents = isDrawer ? 'auto' : 'none';
  canvas.classList.toggle('active', isDrawer);
  turnNotification.textContent = `${drawer.username}'s turn to draw!`;
  turnNotification.classList.remove('hidden');
  setTimeout(() => turnNotification.classList.add('hidden'), 3000);
  startTimer();
});

socket.on('draw', (data) => {
  draw(data);
});

socket.on('correctGuess', () => {
  triggerConfetti();
});

ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';