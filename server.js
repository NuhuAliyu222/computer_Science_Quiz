const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============================================
// CONFIGURATION & SECURITY
// ============================================
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bin_aliyu@121';
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`\n🔧 [CONFIG] Environment: ${NODE_ENV}`);
if (NODE_ENV === 'production') {
  console.log('⚠️  [SECURITY] Using environment-based admin password');
}

// ============================================
// ADMIN LOGIN ENDPOINT
// ============================================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`🔐 [LOGIN] Attempt from ${username}`);
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    console.log(`✅ [LOGIN] Success for ${username}`);
    res.json({ 
      success: true, 
      message: 'Login successful', 
      token: 'admin-token-' + Date.now() 
    });
  } else {
    console.log(`❌ [LOGIN] Failed - invalid credentials`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

// ============================================
// QUESTION MANAGEMENT APIS
// ============================================

// GET all questions
app.get('/api/questions', (req, res) => {
  try {
    const questionsFilePath = path.join(__dirname, 'data', 'questions.json');
    if (fs.existsSync(questionsFilePath)) {
      const data = fs.readFileSync(questionsFilePath, 'utf8');
      const questions = JSON.parse(data);
      res.json({ success: true, questions: questions });
    } else {
      res.json({ success: true, questions: [] });
    }
  } catch (error) {
    console.error('❌ [API] Error loading questions:', error);
    res.status(500).json({ success: false, message: 'Failed to load questions' });
  }
});

// POST new question
app.post('/api/questions', (req, res) => {
  try {
    const { question, options, answer } = req.body;
    const questionsFilePath = path.join(__dirname, 'data', 'questions.json');
    
    let questions = [];
    if (fs.existsSync(questionsFilePath)) {
      const data = fs.readFileSync(questionsFilePath, 'utf8');
      questions = JSON.parse(data);
    }
    
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const newQuestion = {
      id: newId,
      question: question,
      options: options,
      answer: answer
    };
    
    questions.push(newQuestion);
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
    
    console.log(`📚 [API] Question added: ID ${newId}`);
    res.json({ success: true, message: 'Question added', question: newQuestion });
  } catch (error) {
    console.error('❌ [API] Error adding question:', error);
    res.status(500).json({ success: false, message: 'Failed to add question' });
  }
});

// DELETE question
app.delete('/api/questions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const questionsFilePath = path.join(__dirname, 'data', 'questions.json');
    
    let questions = [];
    if (fs.existsSync(questionsFilePath)) {
      const data = fs.readFileSync(questionsFilePath, 'utf8');
      questions = JSON.parse(data);
    }
    
    const filteredQuestions = questions.filter(q => q.id !== id);
    
    if (filteredQuestions.length === questions.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    fs.writeFileSync(questionsFilePath, JSON.stringify(filteredQuestions, null, 2));
    console.log(`🗑️  [API] Question deleted: ID ${id}`);
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('❌ [API] Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// ============================================
// DATA PERSISTENCE
// ============================================

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 [INIT] Created data directory');
}

// Questions file path
const questionsFilePath = path.join(dataDir, 'questions.json');

// Initialize questions.json if it doesn't exist
if (!fs.existsSync(questionsFilePath)) {
  const defaultQuestions = [
    {
      id: 1,
      question: "What does CPU stand for?",
      options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility"],
      answer: 0
    },
    {
      id: 2,
      question: "Which data structure uses LIFO (Last In First Out)?",
      options: ["Queue", "Array", "Stack", "Linked List"],
      answer: 2
    },
    {
      id: 3,
      question: "What does HTTP stand for?",
      options: ["HyperText Transfer Protocol", "High Transfer Text Protocol", "Hyper Transfer Text Protocol", "HyperText Transmission Program"],
      answer: 0
    },
    {
      id: 4,
      question: "Which of these is a JavaScript framework?",
      options: ["Django", "Flask", "React", "Laravel"],
      answer: 2
    },
    {
      id: 5,
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      answer: 1
    }
  ];
  fs.writeFileSync(questionsFilePath, JSON.stringify(defaultQuestions, null, 2));
  console.log('✅ [INIT] Created questions.json with default Computer Science questions');
}

// Helper function to load questions
function loadQuestions() {
  try {
    const data = fs.readFileSync(questionsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ [DATA] Error loading questions:', error);
    return [];
  }
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================

const rooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`\n👤 [SOCKET] Client connected: ${socket.id}`);

  // Handle joining a room
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    
    if (!roomId || !playerName) {
      socket.emit('errorMessage', 'Room ID and player name are required');
      return;
    }

    // Create room if it doesn't exist
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
        timeRemaining: 20
      });
      console.log(`🎮 [ROOM] Created new room: ${roomId}`);
    }

    const room = rooms.get(roomId);
    
    if (room.players.has(socket.id)) {
      socket.emit('errorMessage', 'You are already in this room');
      return;
    }

    if (room.gameActive) {
      socket.emit('errorMessage', 'Game already in progress. Please wait for next round.');
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
      console.log(`👑 [ROOM] ${playerName} is host of ${roomId}`);
    }

    socket.join(roomId);
    
    socket.emit('roomJoined', {
      roomId,
      isHost,
      playersList: Array.from(room.players.values()).map(p => ({ name: p.name, score: p.score })),
      questions: room.questions
    });

    socket.to(roomId).emit('playerJoined', {
      playerName,
      playersCount: room.players.size
    });

    console.log(`✅ [ROOM] ${playerName} joined ${roomId} (${isHost ? 'Host' : 'Player'})`);
  });

  // Handle starting the game
  socket.on('startGame', (data) => {
    const { roomId } = data;
    
    if (!rooms.has(roomId)) {
      socket.emit('errorMessage', 'Room not found');
      return;
    }

    const room = rooms.get(roomId);
    
    if (socket.id !== room.hostId) {
      socket.emit('errorMessage', 'Only the host can start the game');
      return;
    }

    if (!room.questions || room.questions.length === 0) {
      socket.emit('errorMessage', 'No questions available. Please ask admin to add questions.');
      return;
    }

    if (room.players.size < 1) {
      socket.emit('errorMessage', 'Need at least one player to start');
      return;
    }

    room.gameActive = true;
    room.currentQuestionIndex = 0;
    room.answeredPlayers.clear();
    room.timeRemaining = 20;
    
    for (let [playerId, player] of room.players.entries()) {
      player.score = 0;
      room.scores.set(playerId, 0);
    }

    io.to(roomId).emit('gameStarted');
    console.log(`🎮 [GAME] Started in ${roomId} with ${room.players.size} players`);
    
    setTimeout(() => {
      if (room.gameActive && room.questions.length > 0) {
        sendQuestionWithTimer(roomId, room);
      }
    }, 500);
  });

  function sendQuestionWithTimer(roomId, room) {
    if (!room.gameActive) return;
    
    const currentQuestion = room.questions[room.currentQuestionIndex];
    room.answeredPlayers.clear();
    room.timeRemaining = 20;
    
    console.log(`📝 [GAME] Question ${room.currentQuestionIndex + 1}/${room.questions.length} sent to ${roomId}`);
    
    io.to(roomId).emit('nextQuestion', {
      questionData: currentQuestion,
      qIndex: room.currentQuestionIndex,
      total: room.questions.length,
      timeLimit: room.timeRemaining
    });
    
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
    }
    
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
        
        const unansweredCount = room.players.size - room.answeredPlayers.size;
        console.log(`⏰ [GAME] Time's up for Q${room.currentQuestionIndex + 1} (${room.answeredPlayers.size}/${room.players.size} answered)`);
        
        io.to(roomId).emit('timeUp', { 
          message: `Time's up! ${unansweredCount} player(s) didn't answer.`,
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
        }, 3000);
      }
    }, 1000);
  }
  
  function endGame(roomId, room) {
    room.gameActive = false;
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    
    const finalScores = Array.from(room.players.values()).map(p => ({
      name: p.name,
      score: p.score
    })).sort((a, b) => b.score - a.score);
    
    console.log(`🏆 [GAME] Game ended in ${roomId}`);
    console.log(`📊 [GAME] Final scores:`, finalScores);
    
    io.to(roomId).emit('gameOver', { scores: finalScores });
  }

  socket.on('submitAnswer', (data) => {
    const { roomId, answerIndex, isCorrect, playerName } = data;
    
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    
    if (!room.gameActive) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;
    
    // Prevent duplicate answers for same question
    if (room.answeredPlayers.has(socket.id)) {
      console.log(`⚠️  [GAME] ${playerName} already answered Q${room.currentQuestionIndex + 1}`);
      return;
    }
    
    room.answeredPlayers.add(socket.id);
    
    if (isCorrect) {
      player.score += 1;
      room.scores.set(socket.id, player.score);
      socket.emit('scoreUpdate', { score: player.score });
      console.log(`✅ [GAME] ${playerName} correct! Score: ${player.score}`);
    } else {
      console.log(`❌ [GAME] ${playerName} wrong answer`);
    }
    
    // Broadcast answer
    io.to(roomId).emit('playerAnswered', {
      playerName,
      isCorrect,
      totalAnswered: room.answeredPlayers.size,
      totalPlayers: room.players.size
    });
    
    // Check if all players answered
    if (room.answeredPlayers.size === room.players.size) {
      console.log(`✅ [GAME] All players answered Q${room.currentQuestionIndex + 1}, advancing...`);
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      
      io.to(roomId).emit('allAnswered', {
        message: 'All players answered! Moving to next question...'
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
      }, 2000);
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
        
        console.log(`👋 [ROOM] ${player.name} left ${roomId}`);
        
        socket.to(roomId).emit('playerLeft', {
          playerName: player.name,
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          rooms.delete(roomId);
          console.log(`🗑️  [ROOM] Deleted empty room: ${roomId}`);
        } else if (socket.id === room.hostId && room.players.size > 0) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          console.log(`👑 [ROOM] New host: ${newHost.name}`);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
      }
    }
    
    socket.emit('leftRoom');
  });

  socket.on('disconnect', () => {
    console.log(`👤 [SOCKET] Client disconnected: ${socket.id}`);
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        room.players.delete(socket.id);
        
        io.to(roomId).emit('playerLeft', {
          playerName: player.name,
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          rooms.delete(roomId);
          console.log(`🗑️  [ROOM] Deleted empty room: ${roomId} (all players disconnected)`);
        } else if (socket.id === room.hostId) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          console.log(`👑 [ROOM] New host: ${newHost.name}`);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
        break;
      }
    }
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Computer Science Quiz Server Running!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: Ready for real-time connections`);
  console.log(`📚 Questions file: ${questionsFilePath}`);
  console.log(`\n🔐 Admin Login:`);
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Password: ${NODE_ENV === 'production' ? '[from environment]' : ADMIN_PASSWORD}`);
  console.log(`\n💡 Quick Start:`);
  console.log(`   1. Open http://localhost:${PORT} in your browser`);
  console.log(`   2. Create a room (e.g., "TEST123") and join`);
  console.log(`   3. Share the room code with friends`);
  console.log(`   4. Click "Admin Panel" and login with admin credentials`);
  console.log(`   5. Add questions, then host starts the game!`);
  console.log(`${'='.repeat(60)}\n`);
});
