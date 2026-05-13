const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============================================
// CONFIGURATION
// ============================================
const DELAY_AFTER_ANSWER = 500;      // 0.5 seconds before next question
const DELAY_TIME_UP = 800;           
const DELAY_START_GAME = 500;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'bin_aliyu@121';

// ============================================
// PERMANENT DATA STORAGE
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory');
}

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    question: "What does CPU stand for?",
    options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility"],
    answer: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    question: "Which data structure uses LIFO (Last In First Out)?",
    options: ["Queue", "Array", "Stack", "Linked List"],
    answer: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    question: "What does HTTP stand for?",
    options: ["HyperText Transfer Protocol", "High Transfer Text Protocol", "Hyper Transfer Text Protocol", "HyperText Transmission Program"],
    answer: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    question: "Which of these is a JavaScript framework?",
    options: ["Django", "Flask", "React", "Laravel"],
    answer: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    answer: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 6,
    question: "What does SQL stand for?",
    options: ["Structured Query Language", "Simple Query Language", "Structured Question Language", "System Query Language"],
    answer: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 7,
    question: "Which programming language is primarily used for Android development?",
    options: ["Swift", "Kotlin/Java", "C#", "Python"],
    answer: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 8,
    question: "What is the main purpose of Git?",
    options: ["Version Control", "Web Development", "Database Management", "Game Development"],
    answer: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 9,
    question: "What does RAM stand for?",
    options: ["Random Access Memory", "Read Access Memory", "Rapid Access Memory", "Readily Available Memory"],
    answer: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 10,
    question: "Which company created the Java programming language?",
    options: ["Microsoft", "Apple", "Sun Microsystems", "IBM"],
    answer: 2,
    createdAt: new Date().toISOString()
  }
];

if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(DEFAULT_QUESTIONS, null, 2));
  console.log('✅ Created questions.json with default questions');
} else {
  console.log('📚 Loaded existing questions.json file');
}

function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading questions:', error);
    return DEFAULT_QUESTIONS;
  }
}

function saveQuestions(questions) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving questions:', error);
    return false;
  }
}

// ============================================
// API ENDPOINTS
// ============================================

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Login successful', token: 'admin-token-' + Date.now() });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/questions', (req, res) => {
  res.json({ success: true, questions: loadQuestions() });
});

app.post('/api/questions', (req, res) => {
  try {
    const { question, options, answer } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ success: false, message: 'Invalid question data' });
    }
    const questions = loadQuestions();
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const newQuestion = { id: newId, question, options, answer, createdAt: new Date().toISOString() };
    questions.push(newQuestion);
    saveQuestions(questions);
    res.json({ success: true, message: 'Question saved permanently!', question: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const questions = loadQuestions();
    const filteredQuestions = questions.filter(q => q.id !== id);
    if (filteredQuestions.length === questions.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    saveQuestions(filteredQuestions);
    res.json({ success: true, message: 'Question deleted permanently!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GAME STATE MANAGEMENT - INDIVIDUAL PROGRESSION FIXED
// ============================================

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`);

  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    
    if (!roomId || !playerName) {
      socket.emit('errorMessage', 'Room ID and player name are required');
      return;
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: new Map(),
        questions: loadQuestions(),
        gameActive: false,
        hostId: null
      });
    }

    const room = rooms.get(roomId);
    
    if (room.players.has(socket.id)) {
      socket.emit('errorMessage', 'You are already in this room');
      return;
    }

    if (room.gameActive) {
      socket.emit('errorMessage', 'Game already in progress');
      return;
    }

    const isHost = room.players.size === 0;
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      score: 0,
      currentQuestionIndex: 0,
      answered: false,
      timerInterval: null,
      timeRemaining: 30
    });
    
    if (isHost) {
      room.hostId = socket.id;
    }

    socket.join(roomId);
    
    // Send current players list to the new player
    const playersList = Array.from(room.players.values()).map(p => ({ 
      name: p.name, 
      score: p.score 
    }));
    
    socket.emit('roomJoined', {
      roomId,
      isHost,
      playersList: playersList,
      questions: room.questions
    });

    // Broadcast updated player list to everyone in the room
    io.to(roomId).emit('playersUpdate', { 
      players: playersList,
      playersCount: room.players.size
    });
    
    console.log(`${playerName} joined room ${roomId}`);
  });

  socket.on('startGame', (data) => {
    const { roomId } = data;
    
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    
    if (socket.id !== room.hostId) {
      socket.emit('errorMessage', 'Only the host can start the game');
      return;
    }

    if (!room.questions || room.questions.length === 0) {
      socket.emit('errorMessage', 'No questions available');
      return;
    }

    room.gameActive = true;
    
    // Reset each player's progress individually
    for (let [playerId, player] of room.players.entries()) {
      player.score = 0;
      player.currentQuestionIndex = 0;
      player.answered = false;
      player.timeRemaining = 30;
      if (player.timerInterval) {
        clearInterval(player.timerInterval);
        player.timerInterval = null;
      }
    }

    io.to(roomId).emit('gameStarted');
    
    // Send first question to EACH PLAYER INDIVIDUALLY
    setTimeout(() => {
      if (room.gameActive && room.questions.length > 0) {
        for (let [playerId, player] of room.players.entries()) {
          sendQuestionToPlayer(playerId, room, player.currentQuestionIndex);
        }
      }
    }, DELAY_START_GAME);
  });

  // FIXED: Send question to a specific player with proper timer handling
  function sendQuestionToPlayer(playerId, room, questionIndex) {
    const playerSocket = io.sockets.sockets.get(playerId);
    if (!playerSocket) return;
    
    const player = room.players.get(playerId);
    if (!player) return;
    
    // Check if game is still active
    if (!room.gameActive) return;
    
    if (questionIndex >= room.questions.length) {
      // Player finished all questions
      playerSocket.emit('gameComplete', { 
        finalScore: player.score,
        totalQuestions: room.questions.length
      });
      
      // Check if all players finished
      let allFinished = true;
      for (let [pid, p] of room.players.entries()) {
        if (p.currentQuestionIndex < room.questions.length) {
          allFinished = false;
          break;
        }
      }
      
      if (allFinished) {
        endGame(room);
      }
      return;
    }
    
    const currentQuestion = room.questions[questionIndex];
    player.answered = false;
    player.timeRemaining = 30;
    
    playerSocket.emit('nextQuestion', {
      questionData: currentQuestion,
      qIndex: questionIndex,
      total: room.questions.length,
      timeLimit: 30
    });
    
    // Clear existing timer
    if (player.timerInterval) {
      clearInterval(player.timerInterval);
    }
    
    // Start individual timer for this player
    player.timerInterval = setInterval(() => {
      const currentPlayer = room.players.get(playerId);
      if (!currentPlayer || !room.gameActive) {
        if (currentPlayer && currentPlayer.timerInterval) {
          clearInterval(currentPlayer.timerInterval);
        }
        return;
      }
      
      // Don't decrease timer if already answered
      if (currentPlayer.answered) {
        return;
      }
      
      currentPlayer.timeRemaining--;
      playerSocket.emit('timerUpdate', { timeRemaining: currentPlayer.timeRemaining });
      
      if (currentPlayer.timeRemaining <= 0) {
        clearInterval(currentPlayer.timerInterval);
        currentPlayer.timerInterval = null;
        
        if (!currentPlayer.answered) {
          currentPlayer.answered = true;
          const currentQ = room.questions[currentPlayer.currentQuestionIndex];
          playerSocket.emit('timeUp', { 
            message: "Time's up! Moving to next question...",
            correctAnswer: currentQ.answer,
            correctAnswerText: currentQ.options[currentQ.answer]
          });
          
          // Auto-move to next question for this player
          setTimeout(() => {
            if (room.gameActive) {
              currentPlayer.currentQuestionIndex++;
              sendQuestionToPlayer(playerId, room, currentPlayer.currentQuestionIndex);
            }
          }, DELAY_TIME_UP);
        }
      }
    }, 1000);
  }
  
  function endGame(room) {
    room.gameActive = false;
    
    // Clear all timers
    for (let [playerId, player] of room.players.entries()) {
      if (player.timerInterval) {
        clearInterval(player.timerInterval);
        player.timerInterval = null;
      }
    }
    
    const allScores = Array.from(room.players.values()).map(p => ({ 
      name: p.name, 
      score: p.score 
    })).sort((a, b) => b.score - a.score);
    
    io.to(room.id).emit('gameOver', { scores: allScores });
    console.log(`Game ended in room ${room.id}`);
  }

  // FIXED: submitAnswer with proper progression
  socket.on('submitAnswer', (data) => {
    const { roomId, answerIndex, isCorrect } = data;
    
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (!room.gameActive) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;
    
    // Prevent multiple answers for same question
    if (player.answered) {
      socket.emit('errorMessage', 'You already answered this question');
      return;
    }
    
    // Mark as answered immediately
    player.answered = true;
    
    // Clear individual timer
    if (player.timerInterval) {
      clearInterval(player.timerInterval);
      player.timerInterval = null;
    }
    
    // Update score if correct
    if (isCorrect) {
      player.score += 1;
      socket.emit('scoreUpdate', { score: player.score });
    }
    
    const currentQ = room.questions[player.currentQuestionIndex];
    if (isCorrect) {
      socket.emit('answerFeedback', { 
        correct: true, 
        message: '✅ Correct! +1 point',
        yourScore: player.score
      });
    } else {
      socket.emit('answerFeedback', { 
        correct: false, 
        message: `❌ Wrong! Correct answer: ${String.fromCharCode(65 + currentQ.answer)}. ${currentQ.options[currentQ.answer]}`,
        yourScore: player.score
      });
    }
    
    // CRITICAL FIX: Move to next question after delay
    setTimeout(() => {
      if (room.gameActive) {
        // Increment question index
        player.currentQuestionIndex++;
        
        // Check if there are more questions
        if (player.currentQuestionIndex < room.questions.length) {
          // Send next question to this specific player
          sendQuestionToPlayer(socket.id, room, player.currentQuestionIndex);
        } else {
          // Player finished all questions
          socket.emit('gameComplete', { 
            finalScore: player.score,
            totalQuestions: room.questions.length
          });
          
          // Check if all players finished
          let allFinished = true;
          for (let [pid, p] of room.players.entries()) {
            if (p.currentQuestionIndex < room.questions.length) {
              allFinished = false;
              break;
            }
          }
          
          if (allFinished) {
            endGame(room);
          }
        }
      }
    }, DELAY_AFTER_ANSWER);
  });

  socket.on('exitGame', (data) => {
    const { roomId } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const player = room.players.get(socket.id);
      
      if (player) {
        if (player.timerInterval) clearInterval(player.timerInterval);
        room.players.delete(socket.id);
        socket.leave(roomId);
        
        // Send updated player list to everyone
        const playersList = Array.from(room.players.values()).map(p => ({ 
          name: p.name, 
          score: p.score 
        }));
        io.to(roomId).emit('playersUpdate', { 
          players: playersList,
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else if (socket.id === room.hostId && room.players.size > 0) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
        socket.emit('exitConfirmed', { message: 'You have left the game' });
      }
    }
  });

  socket.on('leaveRoom', (data) => {
    const { roomId } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const player = room.players.get(socket.id);
      
      if (player) {
        if (player.timerInterval) clearInterval(player.timerInterval);
        room.players.delete(socket.id);
        socket.leave(roomId);
        
        // Send updated player list to everyone
        const playersList = Array.from(room.players.values()).map(p => ({ 
          name: p.name, 
          score: p.score 
        }));
        io.to(roomId).emit('playersUpdate', { 
          players: playersList,
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else if (socket.id === room.hostId && room.players.size > 0) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
      }
    }
    socket.emit('leftRoom');
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        if (player.timerInterval) clearInterval(player.timerInterval);
        room.players.delete(socket.id);
        
        // Send updated player list to everyone
        const playersList = Array.from(room.players.values()).map(p => ({ 
          name: p.name, 
          score: p.score 
        }));
        io.to(roomId).emit('playersUpdate', { 
          players: playersList,
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else if (socket.id === room.hostId) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
        break;
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 CS Quiz Arena Server Running!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`💾 Permanent storage: ${QUESTIONS_FILE}`);
  console.log(`⚡ INDIVIDUAL PROGRESSION: Each player moves at their own pace`);
  console.log(`🔒 FULL PRIVACY MODE: Players cannot see each other's answers`);
  console.log(`✅ FIXED: Game continues properly after each answer`);
  console.log(`🚪 Exit button: Available during gameplay`);
  console.log(`\n🔐 Admin Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log(`${'='.repeat(60)}\n`);
});
