// script.js

// Constants
const SESSION_EXPIRY_HOURS = 12;
const SESSION_KEY = 'sessionId';
const SESSION_TIME_KEY = 'sessionTimestamp';

// Get sessionId and timestamp from localStorage
let sessionId = localStorage.getItem(SESSION_KEY);
let sessionTimestamp = localStorage.getItem(SESSION_TIME_KEY);

// Check if session exists and is still valid
if (sessionId && sessionTimestamp) {
  const now = Date.now();
  const hoursPassed = (now - parseInt(sessionTimestamp)) / (1000 * 60 * 60);
  if (hoursPassed > SESSION_EXPIRY_HOURS) {
    // Reset session
    sessionId = null;
    sessionTimestamp = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIME_KEY);
  }
}

function sendMessage() {
  let input = document.getElementById("userInput");
  let message = input.value;

  if (message.trim() === "") return;

  addMessage(message, "user");
  input.value = "";

  // Send message to Node backend
  fetch('/send-msg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  })
    .then(res => res.json())
    .then(data => {
      // Save sessionId returned from server
      if (data.sessionId) {
        sessionId = data.sessionId;
        sessionTimestamp = Date.now();
        localStorage.setItem(SESSION_KEY, sessionId);
        localStorage.setItem(SESSION_TIME_KEY, sessionTimestamp);
      }
      addMessage(data.reply, "bot");
    })
    .catch(err => {
      console.error("Error sending message:", err);
      addMessage("Oops, something went wrong.", "bot");
    });
}

function addMessage(text, type) {
  let chatbox = document.getElementById("chatbox");
  let msg = document.createElement("div");
  msg.classList.add("message", type);
  msg.innerText = text;
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}