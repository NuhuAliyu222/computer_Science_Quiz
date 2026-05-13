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
const DELAY_AFTER_ANSWER = 800;      // 0.8 seconds before next question
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

// Default questions (50 questions from your file)
const DEFAULT_QUESTIONS = [
  {
    "id": 1,
    "section": "SECTION A — Fundamentals",
    "question": "A company wants to show yearly profit trends, seasonal patterns, and sudden drops in revenue. Which visualization is MOST appropriate and why?",
    "options": ["Pie Chart", "Line Chart", "Histogram", "Boxplot"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 2,
    "section": "SECTION A — Fundamentals",
    "question": "A hospital dashboard uses pie charts to compare patient ages, treatment costs, and survival rates. Explain why this is a poor visualization choice and recommend better alternatives.",
    "options": [
      "Pie charts are only for geographical data",
      "Pie charts cannot effectively compare continuous numerical values",
      "Pie charts only work for stock prices",
      "Pie charts are used only in Seaborn"
    ],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 3,
    "section": "SECTION A — Fundamentals",
    "question": "You are given customer gender, country, and marital status. Identify the data type and best chart.",
    "options": [
      "Continuous data → Histogram",
      "Numerical data → Heatmap",
      "Nominal categorical data → Bar chart or pie chart",
      "Time-series data → Line chart"
    ],
    "answer": 2,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 4,
    "section": "SECTION A — Fundamentals",
    "question": "A manager wants to compare sales across departments while also showing contribution to total company revenue.",
    "options": ["Scatterplot", "Stacked Bar Chart", "Histogram", "Heatmap"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 5,
    "section": "SECTION A — Fundamentals",
    "question": "Why might a heatmap be more effective than a table for rainfall trends?",
    "options": [
      "Heatmaps remove all data values",
      "Heatmaps use colors to reveal patterns quickly",
      "Tables are only for business reports",
      "Heatmaps cannot display large data"
    ],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 6,
    "section": "SECTION A — Fundamentals",
    "question": "Would exploratory or explanatory visualization be more appropriate first for a large, messy dataset with missing values?",
    "options": ["Explanatory visualization", "Exploratory visualization", "Pie chart visualization", "Decorative visualization"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 7,
    "section": "SECTION A — Fundamentals",
    "question": "What is the difference between information and insight?",
    "options": [
      "They are exactly the same",
      "Information is processed data, insight is meaningful understanding",
      "Insight is raw data",
      "Information is visualization only"
    ],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 8,
    "section": "SECTION A — Fundamentals",
    "question": "Which visualization principle is violated when too many decorative elements are used?",
    "options": ["Correlation principle", "Data-Ink Ratio principle", "Sorting principle", "Filtering principle"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 9,
    "section": "SECTION A — Fundamentals",
    "question": "Which visualization best reveals correlation between study hours, sleep hours, and exam scores?",
    "options": ["Pie chart", "Scatterplot", "Histogram", "Treemap"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 10,
    "section": "SECTION A — Fundamentals",
    "question": "How do Gestalt principles improve dashboard design?",
    "options": ["By adding decorations", "By improving grouping and visual perception", "By increasing chart complexity", "By removing all labels"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 11,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Which Pandas operations are best for cleaning missing ages, duplicates, and incorrect types?",
    "options": ["dropna(), drop_duplicates(), astype()", "plot(), mean(), sum()", "heatmap(), pairplot()", "legend(), xlabel()"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 12,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "What is the difference between df['score'] and df[['score']]?",
    "options": ["Both return DataFrame", "First returns Series, second returns DataFrame", "Both return list", "First returns integer"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 13,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Why would aggregation fail for values like '$500', '$700'?",
    "options": ["Because values are strings, not numeric", "Because strings are faster", "Because aggregation only works in Excel", "Because Pandas cannot read currency"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 14,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Why might a column not appear in df.describe()?",
    "options": ["Column may contain non-numeric data", "Column may contain missing values only", "Both A and B", "None"],
    "answer": 2,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 15,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Why is using df.dropna() dangerous?",
    "options": ["It may remove too much important data", "It creates extra columns", "It changes colors", "It increases duplicates"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 16,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "What is the difference between discrete and continuous data?",
    "options": ["Discrete = measurable, Continuous = countable", "Discrete = countable, Continuous = measurable", "Both are categorical", "Both are nominal"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 17,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Which Pandas function is most suitable for grouping data to find averages?",
    "options": ["groupby()", "heatmap()", "scatterplot()", "pairplot()"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 18,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "True or False: 'Every column in a DataFrame is a Series.'",
    "options": ["False", "True because each column has indexed values", "True because DataFrame stores images", "False because Series has no values"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 19,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "What does df.shape represent?",
    "options": ["Column colors", "Rows and columns count", "Missing values", "Average values"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 20,
    "section": "SECTION B — Pandas & Data Cleaning",
    "question": "Why is df.info() important?",
    "options": ["It checks data structure and missing values", "It creates charts", "It deletes duplicates", "It sorts data automatically"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 21,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Why is using a line chart for gender or faculty misleading?",
    "options": ["Categorical data has no continuous progression", "Line charts are only for maps", "Gender is numerical", "Faculty is continuous"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 22,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "What is the difference between Matplotlib and Seaborn?",
    "options": ["Both are identical", "Matplotlib is low-level; Seaborn is high-level statistical visualization", "Seaborn cannot plot charts", "Matplotlib only works with SQL"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 23,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Scatterplot points tightly clustered upward diagonally imply:",
    "options": ["Negative correlation", "No relationship", "Strong positive correlation", "Outliers only"],
    "answer": 2,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 24,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Why is sns.pairplot() powerful?",
    "options": ["It creates all pairwise relationships automatically", "It deletes columns", "It only works with images", "It creates dashboards"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 25,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Points outside whiskers in a boxplot represent:",
    "options": ["Labels", "Correlation", "Outliers", "Missing values"],
    "answer": 2,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 26,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Which Seaborn plot is best for average salary comparison with confidence intervals?",
    "options": ["Histogram", "Scatterplot", "Barplot", "Heatmap"],
    "answer": 2,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 27,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Why is plt.tight_layout() important?",
    "options": ["Prevents overlapping chart elements", "Adds colors", "Deletes labels", "Removes axes"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 28,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "A correlation of +0.95 means:",
    "options": ["Very weak negative relationship", "Strong positive relationship", "No relationship", "Random distribution"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 29,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "A right-skewed histogram indicates:",
    "options": ["Long tail on the right side", "Perfect symmetry", "Negative-only values", "No variation"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 30,
    "section": "SECTION C — Matplotlib & Seaborn",
    "question": "Using too many colors in a visualization affects:",
    "options": ["Cognitive load and readability negatively", "Database speed only", "Python syntax only", "Storage capacity only"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 31,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "What is the best visualization strategy for telecom analysis?",
    "options": ["Only pie charts", "Combination of line charts, bar charts, heatmaps, and scatterplots", "Only histograms", "Only tables"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 32,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Which charts are suitable for population growth, unemployment, and poverty levels?",
    "options": ["Pie charts only", "Line charts, bar charts, choropleth maps", "Histograms only", "Treemaps only"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 33,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Should correlation imply causation?",
    "options": ["Yes, always", "No, hidden variables may exist", "Yes, for heatmaps only", "Only in Pandas"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 34,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Beautiful dashboards can still fail because of:",
    "options": ["Poor labeling and misleading charts", "Excessive storytelling", "Too much accuracy", "Fast computers"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 35,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "What does 'Good visualization is not about beauty alone' mean?",
    "options": ["Visualization must communicate meaning clearly", "Charts should only be colorful", "Beauty is more important than data", "Data is unnecessary"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 36,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Why is a scatterplot alone insufficient for stock market data?",
    "options": ["Time progression is difficult to track", "Scatterplots cannot display dots", "Stocks are categorical", "Scatterplots delete data"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 37,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Which variables are useful for identifying at-risk students?",
    "options": ["Study hours, attendance, scores, assignment completion", "Shoe size only", "Favorite color only", "Student photos only"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 38,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Why does color-blind accessibility matter in data visualization?",
    "options": ["Some users cannot distinguish certain colors", "Colors increase RAM usage", "Dashboards become slower", "It only affects printers"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 39,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "What is the best visualization for live dashboard updates?",
    "options": ["Static visualization", "Interactive visualization", "Printed table", "PDF image"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 40,
    "section": "SECTION D — Advanced Scenario Questions",
    "question": "Why should visualization differ for different audiences?",
    "options": ["Different audiences require different complexity levels", "Everyone understands charts equally", "Technical analysts dislike data", "Public users prefer code"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 41,
    "section": "SECTION E — Coding & Error Analysis",
    "question": "What is wrong with this code: sns.pieplot(data=df, y='score')?",
    "options": ["Seaborn has no pieplot() function", "'score' is numerical", "Pie charts need DataFrames", "Nothing is wrong"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 42,
    "section": "SECTION E — Coding & Error Analysis",
    "question": "Find the error: titanic = titanic['Age'].fillna(titanic['Age'].mean())",
    "options": ["titanic becomes a Series instead of DataFrame", "fillna() deletes rows", "mean() returns a string", "No error"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 43,
    "section": "SECTION E — Coding & Error Analysis",
    "question": "Why might this code fail: df['age'].astype(int)?",
    "options": ["Missing values or invalid strings may exist", "Integers are unsupported in Pandas", "DataFrame has too many rows", "Python blocks integer conversion"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 44,
    "section": "SECTION E — Coding & Error Analysis",
    "question": "Explain the output: df.groupby('department')['salary'].mean()",
    "options": ["Calculates average salary for each department", "Removes the salary column", "Sorts alphabetically only", "Creates a scatterplot"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 45,
    "section": "SECTION E — Coding & Error Analysis",
    "question": "Why is plotting 100 categories in one bar chart considered poor practice?",
    "options": ["It reduces readability and interpretation", "It improves simplicity", "It increases accessibility", "It improves data grouping"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 46,
    "section": "SECTION F — Critical Thinking",
    "question": "Can a visualization be technically correct but still misleading?",
    "options": ["No, never", "Yes, through poor scaling or selective data presentation", "Only in Microsoft Excel", "Only with pie charts"],
    "answer": 1,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 47,
    "section": "SECTION F — Critical Thinking",
    "question": "Why is storytelling important in data visualization?",
    "options": ["It gives context and meaning to the data", "It replaces actual analysis", "It removes all charts", "It hides important patterns"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 48,
    "section": "SECTION F — Critical Thinking",
    "question": "When should exploratory visualization be used?",
    "options": ["During initial data investigation", "Only after publishing final reports", "Only for decorative purposes", "Only in business settings"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 49,
    "section": "SECTION F — Critical Thinking",
    "question": "How does poor labeling affect decision-making?",
    "options": ["Users may misinterpret the data", "Labels are purely decorative", "Charts become faster to render", "It improves analysis accuracy"],
    "answer": 0,
    "createdAt": new Date().toISOString()
  },
  {
    "id": 50,
    "section": "SECTION F — Critical Thinking",
    "question": "What is the correct relationship between cleaning, analysis, visualization, and insight?",
    "options": [
      "Cleaning → Analysis → Visualization → Insight",
      "Visualization → Cleaning → Randomness → Insight",
      "Analysis → Decoration → Visualization → Insight",
      "Insight → Cleaning → Analysis → Visualization"
    ],
    "answer": 0,
    "createdAt": new Date().toISOString()
  }
];

if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(DEFAULT_QUESTIONS, null, 2));
  console.log('✅ Created questions.json with 50 Computer Science questions');
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
// GAME STATE MANAGEMENT - INDIVIDUAL PROGRESSION
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
        hostId: null,
        globalTimerInterval: null
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
    
    socket.emit('roomJoined', {
      roomId,
      isHost,
      playersList: Array.from(room.players.values()).map(p => ({ name: p.name, score: p.score })),
      questions: room.questions
    });

    socket.to(roomId).emit('playerCountUpdate', { playersCount: room.players.size });
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
      if (player.timerInterval) clearInterval(player.timerInterval);
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

  // Send question to a specific player (individual progression)
  function sendQuestionToPlayer(playerId, room, questionIndex) {
    const playerSocket = io.sockets.sockets.get(playerId);
    if (!playerSocket) return;
    
    const player = room.players.get(playerId);
    if (!player) return;
    
    if (questionIndex >= room.questions.length) {
      // Player finished all questions
      playerSocket.emit('gameComplete', { 
        finalScore: player.score,
        totalQuestions: room.questions.length
      });
      checkAllPlayersFinished(room);
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
      if (!currentPlayer || !room.gameActive || currentPlayer.answered) {
        if (currentPlayer && currentPlayer.timerInterval) clearInterval(currentPlayer.timerInterval);
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
  
  function checkAllPlayersFinished(room) {
    let allFinished = true;
    for (let [playerId, player] of room.players.entries()) {
      if (player.currentQuestionIndex < room.questions.length) {
        allFinished = false;
        break;
      }
    }
    
    if (allFinished) {
      const allScores = Array.from(room.players.values()).map(p => ({ 
        name: p.name, 
        score: p.score 
      })).sort((a, b) => b.score - a.score);
      
      io.to(room.id).emit('gameOver', { scores: allScores });
      console.log(`Game ended in room ${room.id} (all players finished)`);
    }
  }

  socket.on('submitAnswer', (data) => {
    const { roomId, answerIndex, isCorrect, playerName } = data;
    
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (!room.gameActive) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;
    
    if (player.answered) {
      socket.emit('errorMessage', 'You already answered this question');
      return;
    }
    
    player.answered = true;
    
    // Clear individual timer
    if (player.timerInterval) {
      clearInterval(player.timerInterval);
      player.timerInterval = null;
    }
    
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
    
    // Move this player to next question IMMEDIATELY (no waiting for others)
    setTimeout(() => {
      if (room.gameActive) {
        player.currentQuestionIndex++;
        if (player.currentQuestionIndex < room.questions.length) {
          sendQuestionToPlayer(socket.id, room, player.currentQuestionIndex);
        } else {
          // Player finished all questions
          socket.emit('gameComplete', { 
            finalScore: player.score,
            totalQuestions: room.questions.length
          });
          checkAllPlayersFinished(room);
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
        io.to(roomId).emit('playerCountUpdate', { playersCount: room.players.size });
        
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
        io.to(roomId).emit('playerCountUpdate', { playersCount: room.players.size });
        
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
        io.to(roomId).emit('playerCountUpdate', { playersCount: room.players.size });
        
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
  console.log(`📚 Total questions: ${DEFAULT_QUESTIONS.length} Computer Science questions`);
  console.log(`⚡ INDIVIDUAL PROGRESSION: Each player moves at their own pace`);
  console.log(`🔒 PRIVACY MODE: Players cannot see each other's answers`);
  console.log(`🚪 Exit button: Available during gameplay`);
  console.log(`\n🔐 Admin Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log(`${'='.repeat(60)}\n`);
});
