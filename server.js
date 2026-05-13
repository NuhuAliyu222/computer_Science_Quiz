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
const DELAY_AFTER_ANSWER = 800;
const DELAY_TIME_UP = 800;
const DELAY_ALL_ANSWERED = 500;
const DELAY_START_GAME = 500;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'bin_aliyu@121';

// ============================================
// PERMANENT DATA STORAGE
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory');
}

// Default questions (10 Computer Science questions)
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

// Initialize questions file if it doesn't exist
if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(DEFAULT_QUESTIONS, null, 2));
  console.log('✅ Created questions.json with 10 default Computer Science questions');
} else {
  console.log('📚 Loaded existing questions.json file');
}

// Load questions from file
function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    const questions = JSON.parse(data);
    console.log(`📚 Loaded ${questions.length} questions from permanent storage`);
    return questions;
  } catch (error) {
    console.error('Error loading questions:', error);
    return DEFAULT_QUESTIONS;
  }
}

// Save questions to file
function saveQuestions(questions) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    console.log(`💾 Saved ${questions.length} questions to permanent storage`);
    return true;
  } catch (error) {
    console.error('Error saving questions:', error);
    return false;
  }
}

// ============================================
// API ENDPOINTS
// ============================================

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Login successful', token: 'admin-token-' + Date.now() });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// GET all questions
app.get('/api/questions', (req, res) => {
  const questions = loadQuestions();
  res.json({ success: true, questions: questions });
});

// POST - Add new question (PERMANENT SAVE)
app.post('/api/questions', (req, res) => {
  try {
    const { question, options, answer } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ success: false, message: 'Invalid question data' });
    }
    
    const questions = loadQuestions();
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    
    const newQuestion = {
      id: newId,
      question: question,
      options: options,
      answer: answer,
      createdAt: new Date().toISOString()
    };
    
    questions.push(newQuestion);
    
    if (saveQuestions(questions)) {
      console.log(`➕ Admin added question: ID ${newId} - "${question.substring(0, 50)}..."`);
      res.json({ success: true, message: 'Question saved permanently!', question: newQuestion });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save question' });
    }
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE question (PERMANENT REMOVAL)
app.delete('/api/questions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const questions = loadQuestions();
    const filteredQuestions = questions.filter(q => q.id !== id);
    
    if (filteredQuestions.length === questions.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    if (saveQuestions(filteredQuestions)) {
      console.log(`🗑️ Admin deleted question: ID ${id}`);
      res.json({ success: true, message: 'Question deleted permanently!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to delete question' });
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GAME STATE MANAGEMENT
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
        currentQuestionIndex: 0,
        answeredPlayers: new Set(),
        hostId: null,
        scores: new Map(),
        timerInterval: null,
        timeRemaining: 30
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
      score: 0
    });
    
    if (isHost) {
      room.hostId = socket.id;
    }

    socket.join(roomId);
    
    socket.emit('roomJoined', {
      roomId,
      isHost,
      playersList: Array.from(room.players.values()).map(p => ({ name: p.name, score: p.score })),
      questions: room.questions
    });

    socket.to(roomId).emit('playerJoined', { playersCount: room.players.size });
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
    room.currentQuestionIndex = 0;
    room.answeredPlayers.clear();
    room.timeRemaining = 30;
    
    for (let [playerId, player] of room.players.entries()) {
      player.score = 0;
    }

    io.to(roomId).emit('gameStarted');
    
    setTimeout(() => {
      if (room.gameActive && room.questions.length > 0) {
        sendQuestionWithTimer(roomId, room);
      }
    }, DELAY_START_GAME);
  });

  function sendQuestionWithTimer(roomId, room) {
    if (!room.gameActive) return;
    
    const currentQuestion = room.questions[room.currentQuestionIndex];
    room.answeredPlayers.clear();
    room.timeRemaining = 30;
    
    io.to(roomId).emit('nextQuestion', {
      questionData: currentQuestion,
      qIndex: room.currentQuestionIndex,
      total: room.questions.length,
      timeLimit: room.timeRemaining
    });
    
    if (room.timerInterval) clearInterval(room.timerInterval);
    
    room.timerInterval = setInterval(() => {
      if (!room.gameActive) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        return;
      }
      
      room.timeRemaining--;
      io.to(roomId).emit('timerUpdate', { timeRemaining: room.timeRemaining });
      
      if (room.timeRemaining <= 0) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
        
        io.to(roomId).emit('timeUp', { 
          message: "Time's up! Moving to next question...",
          correctAnswer: room.questions[room.currentQuestionIndex].answer,
          correctAnswerText: room.questions[room.currentQuestionIndex].options[room.questions[room.currentQuestionIndex].answer]
        });
        
        setTimeout(() => {
          if (room.gameActive) {
            room.currentQuestionIndex++;
            if (room.currentQuestionIndex < room.questions.length) {
              sendQuestionWithTimer(roomId, room);
            } else {
              endGame(roomId, room);
            }
          }
        }, DELAY_TIME_UP);
      }
    }, 1000);
  }
  
  function endGame(roomId, room) {
    room.gameActive = false;
    if (room.timerInterval) clearInterval(room.timerInterval);
    
    const finalScores = Array.from(room.players.values()).map(p => ({
      name: p.name,
      score: p.score
    })).sort((a, b) => b.score - a.score);
    
    io.to(roomId).emit('gameOver', { scores: finalScores });
    console.log(`Game ended in room ${roomId}`);
  }

  socket.on('submitAnswer', (data) => {
    const { roomId, answerIndex, isCorrect, playerName } = data;
    
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (!room.gameActive) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;
    
    if (room.answeredPlayers.has(socket.id)) {
      socket.emit('errorMessage', 'You already answered this question');
      return;
    }
    
    if (isCorrect) {
      player.score += 1;
      socket.emit('scoreUpdate', { score: player.score });
    }
    
    room.answeredPlayers.add(socket.id);
    
    const currentQ = room.questions[room.currentQuestionIndex];
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
    
    io.to(roomId).emit('someoneAnswered', {
      totalAnswered: room.answeredPlayers.size,
      totalPlayers: room.players.size
    });
    
    if (room.answeredPlayers.size === room.players.size) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      
      setTimeout(() => {
        if (room.gameActive) {
          room.currentQuestionIndex++;
          if (room.currentQuestionIndex < room.questions.length) {
            sendQuestionWithTimer(roomId, room);
          } else {
            endGame(roomId, room);
          }
        }
      }, DELAY_ALL_ANSWERED);
    }
  });

  socket.on('exitGame', (data) => {
    const { roomId } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const player = room.players.get(socket.id);
      
      if (player) {
        room.players.delete(socket.id);
        socket.leave(roomId);
        io.to(roomId).emit('playerLeft', { playersCount: room.players.size });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
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
        room.players.delete(socket.id);
        socket.leave(roomId);
        io.to(roomId).emit('playerLeft', { playersCount: room.players.size });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
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
        room.players.delete(socket.id);
        io.to(roomId).emit('playerLeft', { playersCount: room.players.size });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
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
  console.log(`📚 Default questions: 10 Computer Science questions`);
  console.log(`🔒 Privacy mode: ON (players cannot see each other's answers)`);
  console.log(`🚪 Exit button: Available during gameplay`);
  console.log(`\n🔐 Admin Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log(`${'='.repeat(60)}\n`);
});
