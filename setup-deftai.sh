#!/bin/bash
echo "=== DeftAI 24/7 Auto-Start Setup Starting ==="

# 1. Ask for Token and Codespace Name if not set
read -p "Apna GitHub Personal Access Token (PAT) daal: " GH_TOKEN
read -p "Apna Codespace Name daal (jaise cautious-space-goggles): " CS_NAME

if [ -z "$GH_TOKEN" ] || [ -z "$CS_NAME" ]; then
  echo "❌ Error: Token ya Codespace Name khali nahi ho sakta!"
  exit 1
fi

# 2. Inject Codespace wake-up API route into server.js
if [ -f "server.js" ]; then
  echo "-> Adding API route to server.js..."
  python3 -c "
with open('server.js', 'r') as f:
    content = f.read()

route_code = '''
// Codespace Auto-Start Endpoint Added by Setup
app.post('/api/start-codespace', async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const CODESPACE_NAME = process.env.CODESPACE_NAME;

  if (!GITHUB_TOKEN || !CODESPACE_NAME) {
    return res.status(400).json({ success: false, message: 'GitHub Token or Codespace Name missing!' });
  }

  try {
    const response = await fetch(\`https://api.github.com/user/codespaces/\${CODESPACE_NAME}/start\`, {
      method: 'POST',
      headers: {
        'Authorization': \`token \${GITHUB_TOKEN}\`,
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
'''

if '/api/start-codespace' not in content:
    with open('server.js', 'w') as f:
        f.write(content + route_code)
    print('✅ server.js updated successfully!')
else:
    print('ℹ️ API route already exists in server.js')
"
else
  echo "⚠️ Warning: server.js nahi mili! Pehle server file bana le."
fi

# 3. Create a .env file locally for testing
echo "GITHUB_TOKEN=$GH_TOKEN" > .env
echo "CODESPACE_NAME=$CS_NAME" >> .env
echo "✅ Local .env file created!"

echo ""
echo "=== SETUP COMPLETE! ==="
echo "Ab Render par deploy karte waqt Environment Variables mein yeh daal dena:"
echo "GITHUB_TOKEN = $GH_TOKEN"
echo "CODESPACE_NAME = $CS_NAME"
