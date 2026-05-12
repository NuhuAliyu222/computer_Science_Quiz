const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to questions file
const questionsFilePath = path.join(__dirname, '..', 'data', 'questions.json');

// Helper function to load questions
function loadQuestions() {
  try {
    if (fs.existsSync(questionsFilePath)) {
      const data = fs.readFileSync(questionsFilePath, 'utf8');
      return JSON.parse(data);
    } else {
      // Return default questions if file doesn't exist
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
        },
        {
          id: 6,
          question: "What does SQL stand for?",
          options: ["Structured Query Language", "Simple Query Language", "Structured Question Language", "System Query Language"],
          answer: 0
        },
        {
          id: 7,
          question: "Which programming language is primarily used for Android development?",
          options: ["Swift", "Kotlin/Java", "C#", "Python"],
          answer: 1
        },
        {
          id: 8,
          question: "What is the main purpose of Git?",
          options: ["Version Control", "Web Development", "Database Management", "Game Development"],
          answer: 0
        },
        {
          id: 9,
          question: "What does RAM stand for?",
          options: ["Random Access Memory", "Read Access Memory", "Rapid Access Memory", "Readily Available Memory"],
          answer: 0
        },
        {
          id: 10,
          question: "Which company created the Java programming language?",
          options: ["Microsoft", "Apple", "Sun Microsystems", "IBM"],
          answer: 2
        }
      ];
      
      // Ensure directory exists
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create file with default questions
      fs.writeFileSync(questionsFilePath, JSON.stringify(defaultQuestions, null, 2));
      return defaultQuestions;
    }
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

// Helper function to save questions
function saveQuestions(questions) {
  try {
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving questions:', error);
    return false;
  }
}

// GET /api/questions - Retrieve all questions
router.get('/questions', (req, res) => {
  const questions = loadQuestions();
  res.json({
    success: true,
    count: questions.length,
    questions: questions
  });
});

// GET /api/questions/:id - Retrieve a specific question by ID
router.get('/questions/:id', (req, res) => {
  const questions = loadQuestions();
  const id = parseInt(req.params.id);
  const question = questions.find(q => q.id === id);
  
  if (question) {
    res.json({
      success: true,
      question: question
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
});

// POST /api/questions - Add a new question
router.post('/questions', (req, res) => {
  const { question, options, answer } = req.body;
  
  // Validate input
  if (!question || !options || !Array.isArray(options) || options.length !== 4 || answer === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Invalid question data. Please provide question, 4 options, and answer index (0-3)'
    });
  }
  
  const questions = loadQuestions();
  const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
  
  const newQuestion = {
    id: newId,
    question: question,
    options: options,
    answer: answer
  };
  
  questions.push(newQuestion);
  
  if (saveQuestions(questions)) {
    res.json({
      success: true,
      message: 'Question added successfully',
      question: newQuestion
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save question'
    });
  }
});

// PUT /api/questions/:id - Update an existing question
router.put('/questions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { question, options, answer } = req.body;
  
  const questions = loadQuestions();
  const index = questions.findIndex(q => q.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Update fields if provided
  if (question) questions[index].question = question;
  if (options && Array.isArray(options) && options.length === 4) questions[index].options = options;
  if (answer !== undefined) questions[index].answer = answer;
  
  if (saveQuestions(questions)) {
    res.json({
      success: true,
      message: 'Question updated successfully',
      question: questions[index]
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to update question'
    });
  }
});

// DELETE /api/questions/:id - Delete a question
router.delete('/questions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const questions = loadQuestions();
  const filteredQuestions = questions.filter(q => q.id !== id);
  
  if (filteredQuestions.length === questions.length) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  if (saveQuestions(filteredQuestions)) {
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// POST /api/questions/batch - Replace entire question bank
router.post('/questions/batch', (req, res) => {
  const { questions } = req.body;
  
  if (!Array.isArray(questions)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of questions'
    });
  }
  
  // Validate each question
  for (const q of questions) {
    if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4 || q.answer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Each question must have question text, 4 options, and answer index'
      });
    }
  }
  
  // Ensure each question has an ID
  const questionsWithIds = questions.map((q, index) => ({
    id: q.id || index + 1,
    ...q
  }));
  
  if (saveQuestions(questionsWithIds)) {
    res.json({
      success: true,
      message: 'Question bank updated successfully',
      count: questionsWithIds.length
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save questions'
    });
  }
});

// GET /api/questions/random/:count - Get random questions
router.get('/questions/random/:count', (req, res) => {
  const count = parseInt(req.params.count) || 5;
  const questions = loadQuestions();
  
  // Shuffle and take first 'count' questions
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  const randomQuestions = shuffled.slice(0, Math.min(count, shuffled.length));
  
  res.json({
    success: true,
    count: randomQuestions.length,
    questions: randomQuestions
  });
});

module.exports = router;
