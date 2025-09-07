
#!/bin/bash
echo "Building Slippi Coach executable..."

# Install pkg globally if not already installed
npm install -g pkg

# Build the executable
cd build
npm install --production
pkg . --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --output ../dist/slippi-coach

echo "✅ Build complete! Check the 'dist' folder for your executables."
