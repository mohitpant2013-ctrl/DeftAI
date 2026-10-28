const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const USERS_FILE = 'users_data.txt';

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
}

const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
const saveUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');

// UI Route directly on '/'
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeftAI Control Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0d1117; color: #c9d1d9; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 100vh; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 12px; margin-bottom: 15px; }
        h2 { margin: 0; color: #58a6ff; font-size: 22px; }
        .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .online { background: #238636; color: white; }
        .offline { background: #da3633; color: white; }
        .actions { display: flex; gap: 10px; align-items: center; }
        button { padding: 8px 14px; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px; }
        button:hover { background: #30363d; }
        button.run-btn { background: #238636; border-color: #2ea043; color: white; font-weight: 600; }
        button.stop-btn { background: #da3633; border-color: #f85149; color: white; font-weight: 600; }
        #chatbox { flex: 1; border: 1px solid #30363d; background: #161b22; padding: 20px; overflow-y: auto; border-radius: 8px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 12px; }
        .msg { padding: 12px 16px; border-radius: 8px; max-width: 80%; line-height: 1.5; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
        .user { background: #1f6feb; color: white; align-self: flex-end; }
        .bot { background: #21262d; color: #c9d1d9; align-self: flex-start; border: 1px solid #30363d; }
        .input-area { display: flex; gap: 10px; }
        input[type="text"], input[type="password"] { flex: 1; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: white; border-radius: 6px; font-size: 14px; }
        #auth-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(13, 17, 23, 0.95); display: flex; justify-content: center; align-items: center; z-index: 99; }
        .auth-card { background: #161b22; border: 1px solid #30363d; padding: 30px; border-radius: 12px; width: 320px; display: flex; flex-direction: column; gap: 12px; }
    </style>
</head>
<body>
    <div id="auth-overlay">
        <div class="auth-card">
            <h3 style="color:#58a6ff; margin:0; text-align:center;">DeftAI Access Portal</h3>
            <input type="text" id="login-user" placeholder="Username">
            <input type="password" id="login-pass" placeholder="Password">
            <button style="background:#1f6feb; color:white;" onclick="login()">Login</button>
            <button style="background:#238636; color:white;" onclick="signup()">Sign Up (Creates Account)</button>
        </div>
    </div>

    <div class="header">
        <div>
            <h2>🤖 DeftAI Control Dashboard</h2>
            <span id="model-status" class="status-badge offline">Checking Status...</span>
        </div>
        <div class="actions">
            <button class="run-btn" onclick="startModel()">▶ Start Model</button>
            <button class="stop-btn" onclick="stopModel()">⏹ Stop Model</button>
            <span id="user-display" style="color:#3fb950; font-weight:600;"></span>
            <button onclick="logout()">Logout</button>
        </div>
    </div>

    <div id="chatbox"></div>

    <div class="input-area">
        <input type="text" id="user-input" placeholder="Type your query..." onkeypress="if(event.key === 'Enter') sendMessage()">
        <button style="background:#1f6feb; color:white;" onclick="sendMessage()">Send</button>
    </div>

    <script>
        const BACKEND_URL = window.location.origin;
        let currentUser = null;

        async function checkStatus() {
            try {
                const res = await fetch(\`\${BACKEND_URL}/api/status\`);
                const data = await res.json();
                const badge = document.getElementById('model-status');
                if (data.status === 'Online') {
                    badge.innerText = "Model Active";
                    badge.className = "status-badge online";
                } else {
                    badge.innerText = "Model Offline";
                    badge.className = "status-badge offline";
                }
            } catch (e) {
                document.getElementById('model-status').innerText = "Offline";
            }
        }

        async function startModel() {
            alert("Starting Ollama Service...");
            await fetch(\`\${BACKEND_URL}/api/model/start\`, { method: 'POST' });
            setTimeout(checkStatus, 3000);
        }

        async function stopModel() {
            await fetch(\`\${BACKEND_URL}/api/model/stop\`, { method: 'POST' });
            alert("Ollama Stopped!");
            checkStatus();
        }

        async function signup() {
            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            if(!username || !password) return alert("Fill all fields!");

            const res = await fetch(\`\${BACKEND_URL}/api/signup\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                alert("Account saved to users_data.txt! Now click Login.");
            } else {
                alert(data.error);
            }
        }

        async function login() {
            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            if(!username || !password) return alert("Fill all fields!");

            const res = await fetch(\`\${BACKEND_URL}/api/login\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = username;
                document.getElementById('auth-overlay').style.display = 'none';
                document.getElementById('user-display').innerText = \`👤 \${currentUser}\`;
                renderChatHistory(data.chatHistory || []);
            } else {
                alert(data.error);
            }
        }

        function logout() {
            currentUser = null;
            document.getElementById('auth-overlay').style.display = 'flex';
            document.getElementById('chatbox').innerHTML = '';
        }

        function renderChatHistory(history) {
            const chatbox = document.getElementById('chatbox');
            chatbox.innerHTML = '';
            if(history.length === 0) {
                chatbox.innerHTML = \`<div class="msg bot">Welcome \${currentUser}! Ask me anything.</div>\`;
                return;
            }
            history.forEach(item => {
                chatbox.innerHTML += \`<div class="msg user">\${item.prompt}</div>\`;
                chatbox.innerHTML += \`<div class="msg bot">\${item.response}</div>\`;
            });
            chatbox.scrollTop = chatbox.scrollHeight;
        }

        async function sendMessage() {
            const userInput = document.getElementById('user-input');
            const chatbox = document.getElementById('chatbox');
            const text = userInput.value.trim();
            if(!text || !currentUser) return;

            chatbox.innerHTML += \`<div class="msg user">\${text}</div>\`;
            userInput.value = '';
            chatbox.scrollTop = chatbox.scrollHeight;

            const botDiv = document.createElement('div');
            botDiv.className = 'msg bot';
            botDiv.innerText = '';
            chatbox.appendChild(botDiv);

            try {
                const res = await fetch(\`\${BACKEND_URL}/api/chat\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser, message: text })
                });

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullResponse += chunk;
                    botDiv.innerText = fullResponse;
                    chatbox.scrollTop = chatbox.scrollHeight;
                }
            } catch (e) {
                botDiv.innerText = "⚠️ Error communicating with model.";
            }
            chatbox.scrollTop = chatbox.scrollHeight;
        }

        setInterval(checkStatus, 5000);
        checkStatus();
    </script>
</body>
</html>`);
});

app.get('/api/status', (req, res) => {
    const options = {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/tags',
        method: 'GET'
    };
    const request = http.request(options, (response) => {
        if (response.statusCode === 200) res.json({ status: 'Online' });
        else res.json({ status: 'Offline' });
    });
    request.on('error', () => res.json({ status: 'Offline' }));
    request.end();
});

app.post('/api/model/start', (req, res) => {
    const { exec } = require('child_process');
    exec('ollama serve > /dev/null 2>&1 &', () => {});
    res.json({ success: true });
});

app.post('/api/model/stop', (req, res) => {
    const { exec } = require('child_process');
    exec('pkill ollama', () => {});
    res.json({ success: true });
});

app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    let users = getUsers();
    if (users[username]) return res.status(400).json({ error: 'User exists' });
    users[username] = { password, chatHistory: [] };
    saveUsers(users);
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let users = getUsers();
    if (!users[username] || users[username].password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ success: true, username, chatHistory: users[username].chatHistory || [] });
});

// Streaming Chat API Proxy
app.post('/api/chat', (req, res) => {
    const { username, message } = req.body;

    const ollamaData = JSON.stringify({
        model: 'llama3.2',
        messages: [{ role: 'user', content: message }],
        stream: true
    });

    const options = {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ollamaData)
        }
    };

    let fullReply = "";

    const ollamaReq = http.request(options, (ollamaRes) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        ollamaRes.on('data', (chunk) => {
            try {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.trim() !== '') {
                        const parsed = JSON.parse(line);
                        if (parsed.message && parsed.message.content) {
                            const token = parsed.message.content;
                            fullReply += token;
                            res.write(token);
                        }
                    }
                }
            } catch (err) {
                // skip JSON parse errors on partial chunks
            }
        });

        ollamaRes.on('end', () => {
            res.end();
            // Save history after completion
            let users = getUsers();
            if (users[username]) {
                if (!users[username].chatHistory) users[username].chatHistory = [];
                users[username].chatHistory.push({ prompt: message, response: fullReply });
                saveUsers(users);
            }
        });
    });

    ollamaReq.on('error', (e) => {
        res.status(500).send("Model offline or error executing request.");
    });

    ollamaReq.write(ollamaData);
    ollamaReq.end();
});

app.listen(3000, () => console.log('🚀 Server running with Streaming on Port 3000'));

// Codespace Auto-Start Endpoint Added by Setup
app.post('/api/start-codespace', async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const CODESPACE_NAME = process.env.CODESPACE_NAME;

  if (!GITHUB_TOKEN || !CODESPACE_NAME) {
    return res.status(400).json({ success: false, message: 'GitHub Token or Codespace Name missing!' });
  }

  try {
    const response = await fetch(`https://api.github.com/user/codespaces/${CODESPACE_NAME}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'DeftAI-App'
      }
    });

    if (response.ok) {
      return res.json({ success: true, message: 'Codespace is starting up! Give it 15-20 seconds.' });
    } else {
      const errorData = await response.json();
      return res.status(500).json({ success: false, message: 'Failed to start', details: errorData });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
