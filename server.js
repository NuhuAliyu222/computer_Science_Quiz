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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============================================
// DELAY CONFIGURATION - NORMAL SPEED
// ============================================
const DELAY_AFTER_ANSWER = 800;
const DELAY_TIME_UP = 800;
const DELAY_ALL_ANSWERED = 500;
const DELAY_START_GAME = 500;

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'quizmaster2024';

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ 
      success: true, 
      message: 'Login successful', 
      token: 'admin-token-' + Date.now() 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

// Get all questions
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
    console.error('Error loading questions:', error);
    res.status(500).json({ success: false, message: 'Failed to load questions' });
  }
});

// Add new question (Permanent save)
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
      answer: answer,
      createdAt: new Date().toISOString()
    };
    
    questions.push(newQuestion);
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
    
    console.log(`📚 [PERMANENT] Question saved to disk: ID ${newId}`);
    res.json({ success: true, message: 'Question saved permanently', question: newQuestion });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ success: false, message: 'Failed to add question' });
  }
});

// Delete question (Permanent)
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
    console.log(`🗑️ [PERMANENT] Question deleted: ID ${id}`);
    res.json({ success: true, message: 'Question deleted permanently' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const questionsFilePath = path.join(dataDir, 'questions.json');

// Initialize questions.json if it doesn't exist
if (!fs.existsSync(questionsFilePath)) {
  const defaultQuestions = [
    {
      id: 1,
      question: "What does CPU stand for?",
      options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility"],
      answer: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      question: "Which data structure uses LIFO?",
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
      question: "Which is a JavaScript framework?",
      options: ["Django", "Flask", "React", "Laravel"],
      answer: 2,
      createdAt: new Date().toISOString()
    },
    {
      id: 5,
      question: "Time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      answer: 1,
      createdAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(questionsFilePath, JSON.stringify(defaultQuestions, null, 2));
  console.log('✅ Created questions.json with default questions');
}

function loadQuestions() {
  try {
    const data = fs.readFileSync(questionsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

// Game state storage
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

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
        timeRemaining: 20
      });
    }

    const room = rooms.get(roomId);
    
    if (room.players.has(socket.id)) {
      socket.emit('errorMessage', 'You are already in this room');
      return;
    }

    if (room.gameActive) {
      socket.emit('errorMessage', 'Game already in progress. Please wait.');
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

    // PRIVATE - Only notify that someone joined, not who
    socket.to(roomId).emit('playerJoined', {
      playersCount: room.players.size
    });

    console.log(`${playerName} joined room ${roomId}`);
  });

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
      socket.emit('errorMessage', 'No questions available.');
      return;
    }

    if (room.players.size < 1) {
      socket.emit('errorMessage', 'Need at least one player');
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
    
    setTimeout(() => {
      if (room.gameActive && room.questions.length > 0) {
        sendQuestionWithTimer(roomId, room);
      }
    }, DELAY_START_GAME);

    console.log(`Game started in room ${roomId}`);
  });

  function sendQuestionWithTimer(roomId, room) {
    if (!room.gameActive) return;
    
    const currentQuestion = room.questions[room.currentQuestionIndex];
    room.answeredPlayers.clear();
    room.timeRemaining = 20;
    
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
        
        io.to(roomId).emit('timeUp', { 
          message: `Time's up! Moving to next question...`,
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
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    
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
      room.scores.set(socket.id, player.score);
      socket.emit('scoreUpdate', { score: player.score });
    }
    
    room.answeredPlayers.add(socket.id);
    
    // PRIVATE FEEDBACK - Only the answering player sees result
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
    
    // PRIVATE - Only broadcast that someone answered, not who or if correct
    io.to(roomId).emit('someoneAnswered', {
      totalAnswered: room.answeredPlayers.size,
      totalPlayers: room.players.size
    });
    
    if (room.answeredPlayers.size === room.players.size) {
      if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
      }
      
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

  // EXIT BUTTON HANDLER - User quitting during game
  socket.on('exitGame', (data) => {
    const { roomId, playerName } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const player = room.players.get(socket.id);
      
      if (player) {
        room.players.delete(socket.id);
        socket.leave(roomId);
        
        // Notify others that someone left (without name)
        io.to(roomId).emit('playerLeft', {
          playersCount: room.players.size
        });
        
        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (all players left)`);
        } else if (socket.id === room.hostId && room.players.size > 0) {
          const newHostId = Array.from(room.players.keys())[0];
          room.hostId = newHostId;
          const newHost = room.players.get(newHostId);
          io.to(roomId).emit('newHost', { newHostName: newHost.name });
        }
        
        socket.emit('exitConfirmed', { message: 'You have left the game' });
        console.log(`${player.name} exited game`);
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
        
        io.to(roomId).emit('playerLeft', {
          playersCount: room.players.size
        });
        
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
        
        io.to(roomId).emit('playerLeft', {
          playersCount: room.players.size
        });
        
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

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CS Quiz Arena Server Running!`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔒 Privacy mode: ON (players cannot see each other's answers)`);
  console.log(`💾 Permanent save: Questions saved to disk`);
  console.log(`🚪 Exit button: Available during gameplay`);
  console.log(`\n🔐 Admin Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}\n`);
});
