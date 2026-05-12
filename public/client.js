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

// ============================================
// DELAY CONFIGURATION - NORMAL SPEED
// ============================================
const NORMAL_DELAY = 800;  // 0.8 seconds - Normal delay before next question

// State variables
let currentRoomId = null;
let currentPlayerName = '';
let isHost = false;
let gameActive = false;
let myScore = 0;
let currentQuestionObj = null;
let canAnswer = true;
let questionAnswered = false; // Track if current question is answered

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
    gameDynamicArea.innerHTML = `
      <div class="waiting-message">
        <div class="spinner"></div>
        <p>🎮 Game lobby — host can start the quiz</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">⏱️ Each question: 20 seconds</p>
        <p style="font-size: 0.7rem; margin-top: 0.5rem; color: #fbbf24;"></p>
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
  }
}

// Function to create gold gradient correct answer effect
function showGoldCorrectAnswer() {
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.innerHTML = ['✨', '⭐', '🌟', '💫', '⭐'][Math.floor(Math.random() * 5)];
    particle.style.position = 'fixed';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = window.innerHeight / 2 + 'px';
    particle.style.fontSize = (Math.random() * 25 + 15) + 'px';
    particle.style.opacity = '1';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '10002';
    particle.style.animation = `floatUp ${Math.random() * 1 + 0.5}s ease-out forwards`;
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 1500);
  }
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatUp {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(-200px) rotate(360deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderQuestion(qData, timeLimit = 20) {
  if (!gameActive) return;
  
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
  
  // Show timer
  if (timerDisplay) timerDisplay.classList.remove('hidden');
  updateTimer(timeLimit);
  
  // Add click handlers to options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canAnswer || !gameActive || questionAnswered) return;
      
      const selected = parseInt(btn.getAttribute('data-opt-index'));
      const isCorrect = (selected === answer);
      questionAnswered = true; // Mark as answered to prevent multiple answers
      
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
          fb.style.backgroundSize = '200% auto';
          fb.style.animation = 'gradientShift 0.5s ease';
          fb.style.color = '#1a1a2e';
          fb.style.fontWeight = 'bold';
          fb.style.fontSize = '1.2rem';
          fb.style.border = '3px solid #fbbf24';
          fb.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.8)';
          fb.innerHTML = `🏆✨ GOLDEN CORRECT! +1 POINT! ✨🏆<br>🎉 ${correctLetter}. ${escapeHtml(options[answer])} 🎉`;
          
          showGoldCorrectAnswer();
          
          myScore += 1;
          updateScoreUI();
        } else {
          const correctLetter = String.fromCharCode(65 + answer);
          fb.style.background = 'linear-gradient(135deg, #dc2626, #ef4444, #dc2626)';
          fb.style.backgroundSize = '200% auto';
          fb.style.color = '#ffffff';
          fb.style.fontWeight = 'bold';
          fb.style.fontSize = '1.1rem';
          fb.style.border = '3px solid #ef4444';
          fb.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
          fb.innerHTML = `❌ WRONG ANSWER! ❌<br>📚 Correct answer: ${correctLetter}. ${escapeHtml(options[answer])} 📚<br>🎯 Better luck next question! 🎯`;
        }
      }
      
      // Highlight correct answer in gold
      document.querySelectorAll('.option-btn').forEach((optBtn, idx) => {
        optBtn.disabled = true;
        if (idx === answer) {
          optBtn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
          optBtn.style.color = '#1a1a2e';
          optBtn.style.fontWeight = 'bold';
          optBtn.style.border = '3px solid #fbbf24';
          optBtn.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.5)';
          optBtn.style.transform = 'scale(1.02)';
        } else if (idx === selected && !isCorrect) {
          optBtn.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
          optBtn.style.color = '#ffffff';
          optBtn.style.border = '2px solid #ef4444';
          optBtn.style.textDecoration = 'line-through';
        }
      });
      
      // NORMAL DELAY before next question (800ms)
      setTimeout(() => {
        if (gameActive) {
          // Emit that this player is ready for next question
          socket.emit('playerReadyForNext', { roomId: currentRoomId, playerName: currentPlayerName });
        }
      }, NORMAL_DELAY);
    });
  });
}

function showGameOver(scoresArray) {
  gameActive = false;
  if (timerDisplay) timerDisplay.classList.add('hidden');
  
  let rankingHtml = `
    <div class="waiting-message">
      <h2 style="background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 2rem; margin-bottom: 1rem;">🏆 GAME OVER! 🏆</h2>
      <h3 style="margin-bottom: 1rem; color: #fbbf24;">Final Rankings</h3>
      <ul style="text-align: left; margin-top: 1rem;">
  `;
  
  if (scoresArray && scoresArray.length) {
    scoresArray.sort((a, b) => b.score - a.score);
    scoresArray.forEach((p, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📌';
      const goldStyle = idx === 0 ? 'background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.2); border: 2px solid #fbbf24; font-weight: bold;' : '';
      rankingHtml += `<li style="margin: 0.5rem 0; padding: 0.8rem; border-radius: 0.8rem; ${goldStyle}">
        ${medal} <strong>${escapeHtml(p.name)}</strong> : <span style="color: #fbbf24; font-weight: bold;">${p.score}</span> pts
      </li>`;
    });
  } else {
    rankingHtml += `<li><strong>${escapeHtml(currentPlayerName)}</strong> : ${myScore} pts</li>`;
  }
  
  rankingHtml += `
      </ul>
      <button id="exitToLobbyBtn" class="btn-primary" style="margin-top: 1.5rem;">🏠 Back to Lobby</button>
    </div>
  `;
  
  gameDynamicArea.innerHTML = rankingHtml;
  
  const exitBtn = document.getElementById('exitToLobbyBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (currentRoomId) {
        socket.emit('leaveRoom', { roomId: currentRoomId });
      }
      resetToLobby();
    });
  }
}

function resetToLobby() {
  lobbyScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  adminPanelScreen.classList.add('hidden');
  adminModal.classList.add('hidden');
  currentRoomId = null;
  isHost = false;
  gameActive = false;
  myScore = 0;
  updateScoreUI();
  currentQuestionObj = null;
  canAnswer = true;
  questionAnswered = false;
  if (timerDisplay) timerDisplay.classList.add('hidden');
  roomCodeInput.value = '';
  playerNameInput.value = currentPlayerName || '';
  lobbyError.innerText = '';
  hostBadge.classList.add('hidden');
}

// Admin functions
let adminQuestions = [];

async function adminLogin() {
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  const errorDiv = document.getElementById('adminError');
  
  if (!username || !password) {
    if (errorDiv) errorDiv.innerText = 'Please enter username and password';
    return;
  }
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (errorDiv) errorDiv.innerText = '';
      if (adminModal) adminModal.classList.add('hidden');
      document.getElementById('adminUsername').value = '';
      document.getElementById('adminPassword').value = '';
      
      lobbyScreen.classList.add('hidden');
      gameScreen.classList.add('hidden');
      
      await loadQuestionsForAdmin();
      
      if (adminPanelScreen) {
        adminPanelScreen.classList.remove('hidden');
      }
      
      const toast = document.createElement('div');
      toast.className = 'feedback-toast';
      toast.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
      toast.style.color = '#1a1a2e';
      toast.style.fontWeight = 'bold';
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '10001';
      toast.style.border = '2px solid #fbbf24';
      toast.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.6)';
      toast.innerHTML = '🏆✨ Admin login successful! ✨🏆';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
    } else {
      if (errorDiv) errorDiv.innerText = data.message || 'Login failed.';
    }
  } catch (error) {
    console.error('Login error:', error);
    if (errorDiv) errorDiv.innerText = 'Connection error. Make sure server is running.';
  }
}

async function loadQuestionsForAdmin() {
  try {
    const response = await fetch('/api/questions');
    const data = await response.json();
    if (data.success) {
      adminQuestions = data.questions || [];
      renderAdminQuestionsList();
      const totalSpan = document.getElementById('totalQuestions');
      if (totalSpan) totalSpan.innerText = adminQuestions.length;
    }
  } catch (error) {
    console.error('Error loading questions:', error);
    alert('Failed to load questions');
  }
}

function renderAdminQuestionsList() {
  const container = document.getElementById('adminQuestionsList');
  if (!container) return;
  
  if (adminQuestions.length === 0) {
    container.innerHTML = '<div class="question-item">✨ No questions yet. Add some CS questions!</div>';
    return;
  }
  
  let html = '';
  adminQuestions.forEach((q, idx) => {
    const preview = q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question;
    html += `
      <div class="question-item">
        <span><strong>${idx + 1}.</strong> ${escapeHtml(preview)}</span>
        <button class="remove-q-btn btn-danger" data-id="${q.id}">❌</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  document.querySelectorAll('.remove-q-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      if (confirm('Delete this question?')) {
        await deleteQuestion(id);
      }
    });
  });
}

async function deleteQuestion(id) {
  try {
    const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      await loadQuestionsForAdmin();
      alert('Question deleted!');
    } else {
      alert('Failed to delete question');
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    alert('Failed to delete question');
  }
}

async function addQuestion() {
  const qText = document.getElementById('newQuestionText').value.trim();
  const opt0 = document.getElementById('opt0').value.trim();
  const opt1 = document.getElementById('opt1').value.trim();
  const opt2 = document.getElementById('opt2').value.trim();
  const opt3 = document.getElementById('opt3').value.trim();
  const correctIdx = parseInt(document.getElementById('correctAnswerIndex').value);
  
  if (!qText || !opt0 || !opt1 || !opt2 || !opt3) {
    alert('Please fill in question and all 4 options');
    return;
  }
  
  const newQuestion = {
    question: qText,
    options: [opt0, opt1, opt2, opt3],
    answer: correctIdx
  };
  
  try {
    const response = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQuestion)
    });
    
    const data = await response.json();
    if (data.success) {
      document.getElementById('newQuestionText').value = '';
      document.getElementById('opt0').value = '';
      document.getElementById('opt1').value = '';
      document.getElementById('opt2').value = '';
      document.getElementById('opt3').value = '';
      
      await loadQuestionsForAdmin();
      const toast = document.createElement('div');
      toast.className = 'feedback-toast';
      toast.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
      toast.style.color = '#1a1a2e';
      toast.style.fontWeight = 'bold';
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '10001';
      toast.innerHTML = '✨ Question added successfully! ✨';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } else {
      alert('Failed to add question');
    }
  } catch (error) {
    console.error('Error adding question:', error);
    alert('Failed to add question');
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
    lobbyError.innerText = '❌ Please enter a room code';
    return;
  }
  
  if (!playerName) {
    lobbyError.innerText = '❌ Please enter your nickname';
    return;
  }
  
  currentPlayerName = playerName;
  socket.emit('joinRoom', { roomId, playerName: currentPlayerName });
});

adminBtn.addEventListener('click', () => {
  if (adminModal) {
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
    const errorDiv = document.getElementById('adminError');
    if (errorDiv) errorDiv.innerText = '';
    adminModal.classList.remove('hidden');
  }
});

// Modal close buttons
const closeModalBtn = document.getElementById('closeModalBtn');
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    if (adminModal) adminModal.classList.add('hidden');
  });
}

const closeAdminPanelBtn = document.getElementById('closeAdminPanelBtn');
if (closeAdminPanelBtn) {
  closeAdminPanelBtn.addEventListener('click', () => {
    closeAdminPanel();
  });
}

const adminLoginBtn = document.getElementById('adminLoginBtn');
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', adminLogin);
}

const adminAddQuestionBtn = document.getElementById('adminAddQuestionBtn');
if (adminAddQuestionBtn) {
  adminAddQuestionBtn.addEventListener('click', addQuestion);
}

if (adminModal) {
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.classList.add('hidden');
    }
  });
}

document.getElementById('adminUsername')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') adminLogin();
});
document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') adminLogin();
});

// Socket event handlers
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
  
  if (isHost) {
    hostBadge.classList.remove('hidden');
  } else {
    hostBadge.classList.add('hidden');
  }
  
  renderWaitingArea();
});

socket.on('gameStarted', () => {
  gameActive = true;
  myScore = 0;
  updateScoreUI();
  if (timerDisplay) timerDisplay.classList.remove('hidden');
});

socket.on('nextQuestion', ({ questionData, timeLimit = 20 }) => {
  if (gameActive) {
    renderQuestion(questionData, timeLimit);
  }
});

socket.on('timerUpdate', ({ timeRemaining }) => {
  updateTimer(timeRemaining);
});

socket.on('timeUp', ({ message, correctAnswer, correctAnswerText }) => {
  if (!questionAnswered) {
    canAnswer = false;
    const fb = document.getElementById('questionFeedback');
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c, #f59e0b)';
      fb.style.backgroundSize = '200% auto';
      fb.style.color = '#ffffff';
      fb.style.fontWeight = 'bold';
      fb.style.fontSize = '1.1rem';
      fb.style.border = '3px solid #f59e0b';
      fb.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
      fb.innerHTML = `⏰ TIME'S UP! ⏰<br>🏆 Correct answer: ${String.fromCharCode(65 + correctAnswer)}. ${escapeHtml(correctAnswerText)} 🏆<br>⚡ Next question in ${NORMAL_DELAY/1000} seconds ⚡`;
    }
    
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
    });
  }
});

socket.on('scoreUpdate', ({ score }) => {
  myScore = score;
  updateScoreUI();
});

socket.on('gameOver', ({ scores }) => {
  showGameOver(scores);
});

socket.on('playerJoined', ({ playerName, playersCount }) => {
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.style.borderLeft = '4px solid #60a5fa';
    toast.innerHTML = `✨ ${escapeHtml(playerName)} joined the game! ✨ (${playersCount} players)`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 3000);
  }
});

socket.on('playerLeft', ({ playerName, playersCount }) => {
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.style.borderLeft = '4px solid #f87171';
    toast.innerHTML = `⚠️ ${escapeHtml(playerName)} left the game ⚠️ (${playersCount} players remaining)`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 3000);
  }
});

socket.on('playerAnswered', ({ playerName, isCorrect, totalAnswered, totalPlayers }) => {
  if (playerName !== currentPlayerName && gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = isCorrect ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #ef4444, #dc2626)';
    toast.style.color = '#1a1a2e';
    toast.style.fontWeight = 'bold';
    toast.style.borderLeft = isCorrect ? '4px solid #fbbf24' : '4px solid #ef4444';
    toast.innerHTML = `${escapeHtml(playerName)} ${isCorrect ? '🏆 got it CORRECT! 🏆' : '❌ got it WRONG... ❌'} (${totalAnswered}/${totalPlayers})`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 2000);
  }
});

socket.on('newHost', ({ newHostName }) => {
  if (!isHost && newHostName === currentPlayerName) {
    isHost = true;
    hostBadge.classList.remove('hidden');
    renderWaitingArea();
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    toast.style.color = '#1a1a2e';
    toast.style.fontWeight = 'bold';
    toast.style.fontSize = '1.1rem';
    toast.style.border = '2px solid #fbbf24';
    toast.innerHTML = '🏆✨ YOU ARE NOW THE GOLDEN HOST! ✨🏆<br>Click Start Quiz to begin!';
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 5000);
  }
});

socket.on('errorMessage', (msg) => {
  if (lobbyScreen && !lobbyScreen.classList.contains('hidden')) {
    lobbyError.innerText = msg;
    setTimeout(() => {
      if (lobbyError.innerText === msg) lobbyError.innerText = '';
    }, 5000);
  } else {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'feedback-toast';
    errorDiv.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
    errorDiv.style.color = 'white';
    errorDiv.style.fontWeight = 'bold';
    errorDiv.style.border = '2px solid #ef4444';
    errorDiv.innerHTML = `⚠️ ${escapeHtml(msg)} ⚠️`;
    
    if (gameScreen && !gameScreen.classList.contains('hidden')) {
      gameDynamicArea.insertBefore(errorDiv, gameDynamicArea.firstChild);
    } else {
      document.body.appendChild(errorDiv);
    }
    setTimeout(() => errorDiv.remove(), 4000);
  }
});

socket.on('leftRoom', () => {
  resetToLobby();
});

// Add custom event for player ready for next question
socket.on('moveToNextQuestion', () => {
  if (gameActive) {
    // Server will send next question
    // This is triggered when all players have answered or time is up
  }
});
