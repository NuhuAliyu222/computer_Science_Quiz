// Socket connection
const socket = io();

// DOM elements
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const adminModal = document.getElementById('adminModal');
const adminPanelScreen = document.getElementById('adminPanelScreen');
const roomCodeInput = document.getElementById('roomCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const adminBtn = document.getElementById('adminBtn');
const lobbyError = document.getElementById('lobbyError');
const displayRoomCodeSpan = document.getElementById('displayRoomCode');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const hostBadge = document.getElementById('hostBadge');
const gameDynamicArea = document.getElementById('gameDynamicArea');
const currentScoreSpan = document.getElementById('currentScore');
const timerDisplay = document.getElementById('timerDisplay');
const timerSecondsSpan = document.getElementById('timerSeconds');
const exitGameBtn = document.getElementById('exitGameBtn');

// State variables
let currentRoomId = null;
let currentPlayerName = '';
let isHost = false;
let gameActive = false;
let myScore = 0;
let currentQuestionObj = null;
let canAnswer = true;
let questionAnswered = false;

// Helper functions
function updateScoreUI() {
  currentScoreSpan.innerText = myScore;
}

function updateTimer(seconds) {
  if (timerSecondsSpan) {
    timerSecondsSpan.innerText = seconds;
    const timerCircle = document.querySelector('.timer-circle');
    if (timerCircle) {
      if (seconds <= 5) {
        timerCircle.classList.add('timer-critical');
      } else if (seconds <= 10) {
        timerCircle.classList.add('timer-warning');
      } else {
        timerCircle.classList.remove('timer-warning', 'timer-critical');
      }
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function renderWaitingArea() {
  if (!gameActive) {
    if (exitGameBtn) exitGameBtn.style.display = 'none';
    gameDynamicArea.innerHTML = `
      <div class="waiting-message">
        <div class="spinner"></div>
        <p>🎮 Game lobby — host can start the quiz</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">⏱️ Each question: 20 seconds</p>
        <p style="font-size: 0.7rem; margin-top: 0.5rem; color: #10b981;">🔒 Privacy: Other players cannot see your answers</p>
        ${isHost ? '<button id="hostStartQuizBtn" class="btn-secondary" style="margin-top: 12px;">🔥 Start Quiz Now</button>' : '<p style="margin-top: 1rem;">✨ Waiting for host to begin...</p>'}
      </div>
    `;
    
    if (isHost) {
      const startBtn = document.getElementById('hostStartQuizBtn');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          if (currentRoomId) {
            socket.emit('startGame', { roomId: currentRoomId });
          }
        });
      }
    }
  } else {
    if (exitGameBtn) exitGameBtn.style.display = 'block';
  }
}

function showGoldCorrectAnswer() {
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.innerHTML = '✨';
    particle.style.position = 'fixed';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = window.innerHeight / 2 + 'px';
    particle.style.fontSize = (Math.random() * 20 + 10) + 'px';
    particle.style.opacity = '1';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '10002';
    particle.style.animation = `floatUp ${Math.random() * 1 + 0.5}s ease-out forwards`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }
}

function renderQuestion(qData, timeLimit = 30) {
  if (!gameActive) return;
  if (exitGameBtn) exitGameBtn.style.display = 'block';
  
  currentQuestionObj = qData;
  canAnswer = true;
  questionAnswered = false;
  const { question, options, answer } = qData;
  
  let optsHtml = '';
  options.forEach((opt, idx) => {
    optsHtml += `
      <button class="option-btn" data-opt-index="${idx}">
        ${String.fromCharCode(65 + idx)}. ${escapeHtml(opt)}
      </button>
    `;
  });
  
  gameDynamicArea.innerHTML = `
    <div class="question-text">💡 ${escapeHtml(question)}</div>
    <div class="options-grid" id="optionsContainer">${optsHtml}</div>
    <div id="questionFeedback" class="feedback-toast" style="display: none;"></div>
    <div style="font-size: 0.7rem; text-align: center; margin-top: 10px; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: bold;">
    </div>
  `;
  
  if (timerDisplay) timerDisplay.classList.remove('hidden');
  updateTimer(timeLimit);
  
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canAnswer || !gameActive || questionAnswered) return;
      
      const selected = parseInt(btn.getAttribute('data-opt-index'));
      const isCorrect = (selected === answer);
      questionAnswered = true;
      
      socket.emit('submitAnswer', {
        roomId: currentRoomId,
        answerIndex: selected,
        isCorrect: isCorrect,
        playerName: currentPlayerName
      });
      
      canAnswer = false;
      const fb = document.getElementById('questionFeedback');
      if (fb) {
        fb.style.display = 'block';
        if (isCorrect) {
          const correctLetter = String.fromCharCode(65 + answer);
          fb.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)';
          fb.style.color = '#1a1a2e';
          fb.style.fontWeight = 'bold';
          fb.style.fontSize = '1.2rem';
          fb.style.border = '3px solid #fbbf24';
          fb.innerHTML = `🏆✨ CORRECT! +1 POINT! ✨🏆<br>🎉 ${correctLetter}. ${escapeHtml(options[answer])} 🎉`;
          showGoldCorrectAnswer();
          myScore += 1;
          updateScoreUI();
        } else {
          const correctLetter = String.fromCharCode(65 + answer);
          fb.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
          fb.style.color = '#ffffff';
          fb.style.fontWeight = 'bold';
          fb.style.border = '3px solid #ef4444';
          fb.innerHTML = `❌ WRONG! ❌<br>📚 Correct: ${correctLetter}. ${escapeHtml(options[answer])} 📚`;
        }
      }
      
      document.querySelectorAll('.option-btn').forEach((optBtn, idx) => {
        optBtn.disabled = true;
        if (idx === answer) {
          optBtn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
          optBtn.style.color = '#1a1a2e';
          optBtn.style.border = '3px solid #fbbf24';
        }
      });
    });
  });
}

function showGameOver(scoresArray) {
  gameActive = false;
  if (exitGameBtn) exitGameBtn.style.display = 'none';
  if (timerDisplay) timerDisplay.classList.add('hidden');
  
  let rankingHtml = `
    <div class="waiting-message">
      <h2 style="color: #fbbf24; font-size: 2rem; margin-bottom: 1rem;">🏆 GAME OVER! 🏆</h2>
      <h3>Final Rankings</h3>
      <ul style="text-align: left; margin-top: 1rem;">
  `;
  
  if (scoresArray && scoresArray.length) {
    scoresArray.sort((a, b) => b.score - a.score);
    scoresArray.forEach((p, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📌';
      rankingHtml += `<li style="margin: 0.5rem 0; padding: 0.5rem;">${medal} <strong>${escapeHtml(p.name)}</strong> : ${p.score} pts</li>`;
    });
  }
  
  rankingHtml += `</ul><button id="exitToLobbyBtn" class="btn-primary">🏠 Back to Lobby</button></div>`;
  gameDynamicArea.innerHTML = rankingHtml;
  
  const exitBtn = document.getElementById('exitToLobbyBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (currentRoomId) socket.emit('leaveRoom', { roomId: currentRoomId });
      resetToLobby();
    });
  }
}

function resetToLobby() {
  if (exitGameBtn) exitGameBtn.style.display = 'none';
  lobbyScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  adminPanelScreen.classList.add('hidden');
  adminModal.classList.add('hidden');
  currentRoomId = null;
  isHost = false;
  gameActive = false;
  myScore = 0;
  updateScoreUI();
  if (timerDisplay) timerDisplay.classList.add('hidden');
  roomCodeInput.value = '';
  playerNameInput.value = '';
  lobbyError.innerText = '';
  hostBadge.classList.add('hidden');
}

// Exit button handler
if (exitGameBtn) {
  exitGameBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to exit the game? Your progress will be lost.')) {
      if (currentRoomId) {
        socket.emit('exitGame', { roomId: currentRoomId, playerName: currentPlayerName });
      }
      resetToLobby();
    }
  });
}

// Admin functions
let adminQuestions = [];

async function adminLogin() {
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  const errorDiv = document.getElementById('adminError');
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      adminModal.classList.add('hidden');
      lobbyScreen.classList.add('hidden');
      gameScreen.classList.add('hidden');
      await loadQuestionsForAdmin();
      adminPanelScreen.classList.remove('hidden');
    } else {
      errorDiv.innerText = 'Invalid credentials.';
    }
  } catch (error) {
    errorDiv.innerText = 'Login failed';
  }
}

async function loadQuestionsForAdmin() {
  const response = await fetch('/api/questions');
  const data = await response.json();
  if (data.success) {
    adminQuestions = data.questions;
    renderAdminQuestionsList();
    document.getElementById('totalQuestions').innerText = adminQuestions.length;
  }
}

function renderAdminQuestionsList() {
  const container = document.getElementById('adminQuestionsList');
  if (!container) return;
  
  if (adminQuestions.length === 0) {
    container.innerHTML = '<div>No questions yet. Add some!</div>';
    return;
  }
  
  let html = '';
  adminQuestions.forEach((q, idx) => {
    html += `<div class="question-item"><span><strong>${idx + 1}.</strong> ${escapeHtml(q.question.substring(0, 50))}</span></div>`;
  });
  container.innerHTML = html;
}

async function addQuestion() {
  const qText = document.getElementById('newQuestionText').value.trim();
  const opt0 = document.getElementById('opt0').value.trim();
  const opt1 = document.getElementById('opt1').value.trim();
  const opt2 = document.getElementById('opt2').value.trim();
  const opt3 = document.getElementById('opt3').value.trim();
  const correctIdx = parseInt(document.getElementById('correctAnswerIndex').value);
  
  if (!qText || !opt0 || !opt1 || !opt2 || !opt3) {
    alert('Please fill all fields');
    return;
  }
  
  const newQuestion = {
    question: qText,
    options: [opt0, opt1, opt2, opt3],
    answer: correctIdx
  };
  
  const response = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newQuestion)
  });
  
  if (response.ok) {
    document.getElementById('newQuestionText').value = '';
    document.getElementById('opt0').value = '';
    document.getElementById('opt1').value = '';
    document.getElementById('opt2').value = '';
    document.getElementById('opt3').value = '';
    await loadQuestionsForAdmin();
    alert('Question added!');
  }
}

function closeAdminPanel() {
  adminPanelScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
}

// Event handlers
joinRoomBtn.addEventListener('click', () => {
  const roomId = roomCodeInput.value.trim().toUpperCase();
  const playerName = playerNameInput.value.trim();
  
  if (!roomId) {
    lobbyError.innerText = 'Please enter a room code';
    return;
  }
  if (!playerName) {
    lobbyError.innerText = 'Please enter your nickname';
    return;
  }
  
  currentPlayerName = playerName;
  socket.emit('joinRoom', { roomId, playerName: currentPlayerName });
});

adminBtn.addEventListener('click', () => {
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminError').innerText = '';
  adminModal.classList.remove('hidden');
});

document.getElementById('closeModalBtn')?.addEventListener('click', () => adminModal.classList.add('hidden'));
document.getElementById('closeAdminPanelBtn')?.addEventListener('click', closeAdminPanel);
document.getElementById('adminLoginBtn')?.addEventListener('click', adminLogin);
document.getElementById('adminAddQuestionBtn')?.addEventListener('click', addQuestion);

// Socket events
socket.on('roomJoined', (data) => {
  currentRoomId = data.roomId;
  isHost = data.isHost;
  gameActive = false;
  myScore = 0;
  updateScoreUI();
  
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  displayRoomCodeSpan.innerText = currentRoomId;
  playerNameDisplay.innerText = currentPlayerName;
  
  if (isHost) hostBadge.classList.remove('hidden');
  else hostBadge.classList.add('hidden');
  
  renderWaitingArea();
});

socket.on('gameStarted', () => {
  gameActive = true;
  myScore = 0;
  updateScoreUI();
  if (timerDisplay) timerDisplay.classList.remove('hidden');
});

socket.on('nextQuestion', ({ questionData, timeLimit = 30 }) => {
  if (gameActive) renderQuestion(questionData, timeLimit);
});

socket.on('timerUpdate', ({ timeRemaining }) => updateTimer(timeRemaining));

socket.on('timeUp', ({ message, correctAnswer, correctAnswerText }) => {
  if (!questionAnswered) {
    const fb = document.getElementById('questionFeedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `⏰ TIME'S UP!<br>Correct: ${String.fromCharCode(65 + correctAnswer)}. ${escapeHtml(correctAnswerText)}`;
    }
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
  }
});

socket.on('scoreUpdate', ({ score }) => {
  myScore = score;
  updateScoreUI();
});

socket.on('gameOver', ({ scores }) => showGameOver(scores));

socket.on('playerJoined', ({ playersCount }) => {
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
  toast.innerHTML = `✨ New player joined! (${playersCount} players) ✨`;
  gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
  setTimeout(() => toast.remove(), 3000);
});

socket.on('playerLeft', ({ playersCount }) => {
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
  toast.innerHTML = `⚠️ A player left (${playersCount} remaining)`;
  gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
  setTimeout(() => toast.remove(), 3000);
});

socket.on('someoneAnswered', ({ totalAnswered, totalPlayers }) => {
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
 // toast.innerHTML = `📝 ${totalAnswered}/${totalPlayers} players answered`;
  gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
  setTimeout(() => toast.remove(), 2000);
});

socket.on('errorMessage', (msg) => {
  lobbyError.innerText = msg;
  setTimeout(() => { lobbyError.innerText = ''; }, 5000);
});

socket.on('leftRoom', () => resetToLobby());

console.log('✅ Client loaded successfully');
