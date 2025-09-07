========================================
SLIPPI COACH - Live AI Commentary
========================================

Get real-time AI commentary while you play Melee!
Works with Slippi Dolphin - no modifications needed.

WHAT IT DOES:
- Watches your Slippi matches in real-time
- Provides live AI commentary on your gameplay
- Shows damage, stocks, and game stats
- Captures your game screen for integrated viewing
- Works with online, offline, and training mode

INSTALLATION (First Time Only):
1. Extract this folder anywhere on your computer
2. Double-click "SETUP.bat" 
3. Wait for installation to complete (may take 5-10 minutes)
4. Add your AI API key to the .env file (see below)

USAGE (Every Time):
1. Launch Slippi Dolphin first
2. Double-click "Launch Slippi Coach.bat"
3. Browser opens automatically to Game Viewer
4. Click "Settings" → "Scan for Game Windows"
5. Select your Slippi window
6. Start playing → Get live commentary!

AI API SETUP:
You need an AI API key for commentary to work:

Option 1 - OpenAI (Recommended):
- Go to https://platform.openai.com/api-keys
- Create account and get API key
- Edit .env file, replace "your_openai_key_here" with your key

Option 2 - Anthropic:
- Go to https://console.anthropic.com/
- Create account and get API key  
- Edit .env file, replace "your_anthropic_key_here" with your key

TROUBLESHOOTING:

"Node.js not found":
- Run SETUP.bat first, it will help you install Node.js

"Port already in use":
- Close other programs that might use ports 3000 or 5173
- Or restart your computer

"Can't capture Slippi window":
- Make sure Slippi Dolphin is running
- Try running as Administrator
- Make sure Windows isn't blocking the app

"No commentary appearing":
- Check that you added your AI API key to .env file
- Make sure you have internet connection
- Try starting a new match

Browser doesn't open:
- Manually go to: http://localhost:5173/game-viewer
- Try a different browser (Chrome recommended)

FEATURES:
✓ Real-time damage and stock tracking
✓ Live AI commentary on combos, kills, techs
✓ Screen capture integration
✓ Works with all Slippi modes
✓ Tournament-style display
✓ Customizable commentary speed
✓ Export commentary logs

SYSTEM REQUIREMENTS:
- Windows 10/11
- Slippi Dolphin (any recent version)
- Internet connection (for AI commentary)
- 4GB+ RAM recommended

COMMUNITY:
- Report bugs and request features on GitHub
- Share your best commentary moments
- Help improve the AI training

VERSION: 1.0
CREATED FOR: The Melee Community
COMPATIBLE WITH: All Slippi versions

========================================
Enjoy your AI coaching experience!
========================================
