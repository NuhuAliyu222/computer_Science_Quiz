# 🎯 CS Quiz Arena - Real-time Multiplayer Quiz Game

A blazing-fast real-time multiplayer quiz game focused on **Computer Science topics**, built with **Node.js**, **Express**, and **Socket.io**. Features beautiful golden UI, instant game progression, and a complete admin panel for managing questions.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- 🎮 **Real-time Multiplayer** - WebSocket-powered instant game synchronization
- 👑 **Host Controls** - Game management, question administration, player oversight
- 📚 **Question Bank Management** - Complete CRUD operations (Add/Edit/Remove questions)
- 💻 **Computer Science Focused** - 10+ pre-loaded CS questions, easily expandable
- 📱 **Responsive Design** - Works seamlessly on laptop, tablet, and mobile
- 🔐 **Private Rooms** - Unique room codes with no player limits
- ⚡ **Instant Feedback** - Immediate score updates and animations
- 🏆 **Smart Leaderboard** - Auto-advances when all players answer or time expires
- 🌟 **Golden UI** - Stunning gradient animations and particle effects
- 🛡️ **Secure Credentials** - Environment-based configuration (no hardcoding)

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js + Express.js |
| **Real-time** | Socket.io 4.6+ |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Storage** | JSON file-based (easily upgradeable to MongoDB) |
| **Deploy** | Render, Heroku, Railway, or any Node host |

---

## 📦 Installation

### Prerequisites
- **Node.js** 14.0+ 
- **npm** or **yarn**

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/NuhuAliyu222/computer_Science_Quiz.git
cd computer_Science_Quiz

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your preferences (optional for local dev)
nano .env

# 5. Start the server
npm run dev

# 6. Open browser
# http://localhost:3000
```

---

## 🚀 Quick Start

### For Players:
1. Open **http://localhost:3000**
2. Enter a **Room Code** (e.g., `QUIZ123`)
3. Enter your **Nickname**
4. Click **"🚀 Join / Create Room"**
5. Wait for the host to start, then answer questions in 20 seconds each
6. See your final rank on the leaderboard

### For Hosts:
1. Follow player steps above
2. You'll see a **"🔥 Start Quiz Now"** button
3. Click it to begin the game
4. Game auto-advances when all players answer or time runs out

### For Admins:
1. Click **"🔐 Admin Panel"** button on lobby screen
2. Default credentials: `admin` / `bin_aliyu@121`
3. **Add questions** with 4 options and mark the correct answer
4. **Manage questions** - view, edit, or delete as needed

---

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Server
PORT=3000
NODE_ENV=development

# Admin Credentials (CHANGE IN PRODUCTION!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=bin_aliyu@121

# Game Settings
QUESTION_TIME_LIMIT=20          # Seconds per question
MAX_PLAYERS_PER_ROOM=50         # Player limit per room
INACTIVITY_TIMEOUT=3600000      # 1 hour in milliseconds
```

---

## 📂 Project Structure

```
computer_Science_Quiz/
├── server.js                 # 🔧 Main backend (Express + Socket.io)
├── package.json              # 📦 Dependencies
├── .env.example              # ⚙️ Configuration template
│
├── public/
│   ├── index.html           # 🏠 Main UI
│   ├── client.js            # 💻 Frontend logic (715 lines)
│   ├── style.css            # 🎨 Beautiful styling (844 lines)
│   └── logo.png             # 🖼️ App logo
│
├── data/
│   └── questions.json       # 📚 Question database
│
└── routes/
    └── api.js              # 🔌 Additional API routes (optional)
```

---

## 🎮 Game Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   LOBBY     │────▶│   QUESTIONS  │────▶│  LEADERBOARD │
│             │     │              │     │              │
│ Join Room   │     │ Answer (20s) │     │  Final Rank  │
│ Host Starts │     │ Get Feedback │     │ Back to Lobby│
└─────────────┘     └──────────────┘     └──────────────┘
```

### Question Features:
- ⏱️ **20-second timer** (configurable)
- 🎯 **Instant feedback** - Shows if you're right/wrong
- 🏆 **Particle animations** - Gold stars for correct answers
- 👀 **Correct answer revealed** - All players see the right answer
- 🔄 **Auto-advance** - Moves to next question when all players answer or time expires

---

## 🔌 API Endpoints

### Admin
```
POST /api/admin/login
  Request: { "username": "admin", "password": "bin_aliyu@121" }
  Response: { "success": true, "token": "admin-token-..." }
```

### Questions
```
GET    /api/questions                      # Get all questions
POST   /api/questions                      # Add new question
DELETE /api/questions/:id                  # Delete question
```

---

## 🎯 Socket Events

### Client → Server
```javascript
socket.emit('joinRoom', { roomId, playerName })
socket.emit('startGame', { roomId })
socket.emit('submitAnswer', { roomId, answerIndex, isCorrect, playerName })
socket.emit('leaveRoom', { roomId })
```

### Server → Client
```javascript
socket.on('roomJoined', { roomId, isHost, playersList, questions })
socket.on('gameStarted', { timeLimit })
socket.on('nextQuestion', { questionData, qIndex, total, timeLimit })
socket.on('timerUpdate', { timeRemaining })
socket.on('timeUp', { message, correctAnswer, correctAnswerText })
socket.on('scoreUpdate', { score })
socket.on('gameOver', { scores })
socket.on('playerJoined', { playerName, playersCount })
socket.on('playerLeft', { playerName, playersCount })
socket.on('playerAnswered', { playerName, isCorrect, totalAnswered, totalPlayers })
socket.on('newHost', { newHostName })
socket.on('errorMessage', message)
```

---

## 🚀 Deployment

### Deploy to **Render** (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "Deploy to Render"
git push origin main

# Create render.yaml
cat > render.yaml << EOF
services:
  - type: web
    name: cs-quiz-arena
    env: node
    plan: free
    startCommand: npm start
    envVars:
      - key: PORT
        value: 3000
      - key: ADMIN_USERNAME
        value: admin
      - key: ADMIN_PASSWORD
        value: your_secure_password_here
EOF

# Deploy via Render dashboard
# https://render.com
```

### Deploy to **Heroku**
```bash
# Install Heroku CLI
heroku login
heroku create cs-quiz-arena
heroku config:set ADMIN_PASSWORD=your_secure_password
git push heroku main
```

### Deploy to **Railway**
```bash
# Connect GitHub repo at railway.app
# Set environment variables in dashboard
# Auto-deploys on push
```

---

## 🔒 Security Notes

⚠️ **IMPORTANT**: 
- Change `ADMIN_PASSWORD` in `.env` before deploying to production
- Use environment variables, NEVER hardcode credentials
- Consider using JWT tokens for admin authentication in production
- Add rate limiting for admin login attempts
- Use HTTPS in production

---

## 📊 Features Roadmap

- [ ] User authentication system
- [ ] Persistent user profiles & rankings
- [ ] MongoDB integration for scalability
- [ ] Question categories & difficulty levels
- [ ] Timed question pools (random selection)
- [ ] Multiplayer tournaments
- [ ] Real-time spectator mode
- [ ] Admin dashboard with analytics
- [ ] Question import/export (CSV, JSON)
- [ ] Dark/Light theme toggle
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Nuhu Aliyu Abdullahi**
- GitHub: [@NuhuAliyu222](https://github.com/NuhuAliyu222)
- Sokoto State University - Faculty of Computing

---

## 🙏 Acknowledgments

- Socket.io team for real-time WebSocket magic
- Express.js community for solid backend framework
- Beautiful gradient inspiration from modern UI design trends

---

## 📧 Support

Found a bug? Have a suggestion? 
- **Open an Issue**: [GitHub Issues](https://github.com/NuhuAliyu222/computer_Science_Quiz/issues)
- **Email**: nuhualiyu@example.com

---

## 🌟 Show Your Support

If you like this project, please give it a ⭐ on GitHub!

---

<div align="center">

**Made with ❤️ for Computer Science learners everywhere**

</div>
