# 🎮 Coach Clippi - Slippi Green Overlay System

A beautiful, high-performance overlay system that wraps around your Slippi Dolphin window with Slippi's signature green theme! 

![Slippi Green](https://img.shields.io/badge/Slippi-Green-21ba45?style=for-the-badge)
![Windows](https://img.shields.io/badge/Windows-Compatible-0078D6?style=for-the-badge)
![Real-time](https://img.shields.io/badge/Real--time-Overlay-00ff88?style=for-the-badge)

## ✨ Features

### 🎨 Visual Excellence
- **Slippi Green Theme**: Beautiful gradient overlays using Slippi's signature #21ba45 green
- **Glass Morphism Effects**: Modern frosted glass appearance with depth
- **Multi-layer Glow**: Outer glow, border, and inner accent for stunning visuals
- **Pulse Animations**: Subtle breathing effect for living overlays
- **High Contrast Text**: White text with shadows for perfect readability

### 🔧 Advanced Technology
- **Window Tracking**: Automatically follows your Dolphin window
- **20 FPS Updates**: Smooth repositioning as you move/resize Dolphin
- **Auto-reconnect**: Finds Dolphin again if you restart it
- **Low Latency**: Direct DLL injection for minimal performance impact

## 🚀 Quick Start

### Prerequisites
- Windows 10/11
- [Node.js](https://nodejs.org/) (v14 or higher)
- Visual Studio Build Tools or Visual Studio 2019+
- Slippi Dolphin

### One-Click Launch

1. **Start Slippi Dolphin first**
2. **Double-click `LaunchSlippiOverlay.bat`**
3. That's it! The overlay is now active

## 📖 Usage Guide

### Running the Overlay

```batch
# Method 1: Use the launcher (Recommended)
LaunchSlippiOverlay.bat

# Method 2: Direct Node.js
node src/overlay/launcher.js

# Method 3: Manual test
node test_overlay_clean.js
```

### Interactive Menu

Once launched, you'll see an interactive menu:

```
╔════════════════════════════════════╗
║           OVERLAY CONTROLS         ║
╠════════════════════════════════════╣
║  1. Send test message              ║
║  2. Toggle overlay visibility      ║
║  3. Restart overlay                ║
║  4. Exit                           ║
╚════════════════════════════════════╝
```

**Options:**
- **1**: Sends a random coaching message to test the overlay
- **2**: Shows/hides the overlay without stopping it
- **3**: Fully restarts the overlay system
- **4**: Cleanly exits and removes the overlay

### Test Messages

Press `1` in the menu to see messages like:
- "Great wavedash!"
- "Perfect L-cancel timing!"
- "Watch your DI on that combo!"
- "Excellent edgeguard setup!"

## 🛠️ Development

### Project Structure

```
Coach Clippi/
├── LaunchSlippiOverlay.bat      # User-friendly launcher
├── build/
│   └── overlay.dll               # Compiled overlay DLL
├── src/overlay/
│   ├── launcher.js               # Interactive launcher
│   ├── overlayManager.js         # Main overlay manager
│   ├── config/
│   │   └── overlayConfig.js      # Theme configurations
│   └── injection/
│       ├── overlay_simple.cpp    # Enhanced C++ overlay
│       ├── overlay_simple.h      # Header definitions
│       └── build_dll.bat         # DLL builder
└── test_overlay_clean.js         # Test injection script
```

### Building from Source

If you modify the C++ overlay code:

```batch
cd src\overlay\injection
build_dll.bat
```

### Customizing Colors

Edit `src/overlay/injection/overlay_simple.cpp`:

```cpp
// Main Slippi green: #21ba45 (RGB: 33, 186, 69)
Color(baseAlpha, 33, 186, 69),  // Change RGB values here
```

## 🎮 Integration with Coach Clippi

This overlay system integrates seamlessly with the Coach Clippi AI coaching system:

1. **Real-time Analysis**: Receives coaching advice from the AI
2. **Visual Feedback**: Displays tips directly on your game window
3. **Non-intrusive**: Transparent overlays that don't block gameplay
4. **Context-aware**: Messages positioned based on game state

## 🐛 Troubleshooting

### "Slippi Dolphin is not running"
- Start Slippi Dolphin before launching the overlay

### "overlay.dll not found"
- The launcher will automatically build it
- Or manually run `src\overlay\injection\build_dll.bat`

### "Node.js is not installed"
- Download and install from [nodejs.org](https://nodejs.org/)

### Overlay not appearing
1. Make sure Slippi Dolphin is in windowed or borderless mode
2. Try option 3 (Restart overlay) from the menu
3. Check if Windows Defender is blocking the DLL

### Visual Studio errors
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019)
- Run from Developer Command Prompt if needed

## 🎨 Customization

### Change Display Duration
Edit `src/overlay/config/overlayConfig.js`:
```javascript
displayDuration: 5000,  // Milliseconds (5 seconds default)
```

### Adjust Transparency
```javascript
transparency: 80,  // 0-100 (80% default)
```

### Modify Font Size
```javascript
fontSize: 24,  // Pixels (24px default)
```

## 🏆 Features Showcase

### Window Tracking
The overlay automatically:
- Finds your Dolphin window
- Follows it when moved
- Resizes to match
- Reconnects if Dolphin restarts

### Slippi Green Theme
- Primary: `#21ba45` (Slippi's brand color)
- Gradient: Transitions to darker green
- Glow: Bright green outer halo
- Border: Dark green for definition

### Performance
- Minimal CPU usage (<1%)
- No FPS impact on Dolphin
- 60 FPS rendering capability
- Efficient message queuing

## 📝 License

This overlay system is part of the Coach Clippi project and follows the same license terms.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 🎉 Enjoy Your Enhanced Slippi Experience!

The overlay is now wrapping around your Dolphin window with beautiful Slippi green coaching messages. Happy training!
