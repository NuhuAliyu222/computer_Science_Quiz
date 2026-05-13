// Add this with your other DOM elements
const exitGameBtn = document.getElementById('exitGameBtn');

// Add exit button handler
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

// Update renderWaitingArea to show exit button
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

// Update renderQuestion to show exit button
function renderQuestion(qData, timeLimit = 20) {
  if (!gameActive) return;
  if (exitGameBtn) exitGameBtn.style.display = 'block';
  // ... rest of your renderQuestion code
}

// Update showGameOver to hide exit button
function showGameOver(scoresArray) {
  if (exitGameBtn) exitGameBtn.style.display = 'none';
  gameActive = false;
  // ... rest of your showGameOver code
}

// Update resetToLobby to hide exit button
function resetToLobby() {
  if (exitGameBtn) exitGameBtn.style.display = 'none';
  // ... rest of your resetToLobby code
}

// Update socket event handlers for privacy
socket.on('playerJoined', ({ playersCount }) => {
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.innerHTML = `✨ A new player joined! (${playersCount} players total) ✨`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 3000);
  }
});

socket.on('playerLeft', ({ playersCount }) => {
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.innerHTML = `⚠️ A player left the game ⚠️ (${playersCount} players remaining)`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 3000);
  }
});

socket.on('someoneAnswered', ({ totalAnswered, totalPlayers }) => {
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.style.background = 'rgba(59,130,246,0.2)';
    toast.innerHTML = `📝 ${totalAnswered}/${totalPlayers} players have answered`;
    gameDynamicArea.insertBefore(toast, gameDynamicArea.firstChild);
    setTimeout(() => toast.remove(), 2000);
  }
});

// Remove or comment out the old playerAnswered event
// socket.on('playerAnswered', ...) - REMOVE THIS

socket.on('exitConfirmed', ({ message }) => {
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
  toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  toast.style.color = 'white';
  toast.style.fontWeight = 'bold';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
});
