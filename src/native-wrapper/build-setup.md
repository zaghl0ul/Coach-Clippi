# Build Setup Instructions

Since CMake is not currently installed, here are the steps to get the native wrapper building:

## Option 1: Install CMake (Recommended)

1. **Download CMake:**
   - Go to https://cmake.org/download/
   - Download "Windows x64 Installer" (cmake-3.x.x-windows-x86_64.msi)

2. **Install CMake:**
   - Run the installer
   - **IMPORTANT:** Check "Add CMake to system PATH for all users" during installation

3. **Verify Installation:**
   ```powershell
   cmake --version
   ```

4. **Build the Application:**
   ```powershell
   cd src/native-wrapper
   .\build.bat
   ```

## Option 2: Use Visual Studio Directly (Alternative)

If you have Visual Studio 2019/2022 installed:

1. **Generate Project Files:**
   ```powershell
   cd src/native-wrapper
   mkdir build
   cd build
   "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" .. -G "Visual Studio 17 2022" -A x64
   ```

2. **Build:**
   ```powershell
   "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" --build . --config Release
   ```

## Option 3: Manual Compilation (If no CMake)

If you can't install CMake, you can compile manually:

1. **Open Visual Studio Developer Command Prompt**
2. **Navigate to the project:**
   ```cmd
   cd "C:\Users\mikazukinoyaiba\Desktop\Coach Clippi\src\native-wrapper"
   ```

3. **Compile manually:**
   ```cmd
   cl /EHsc /std:c++17 /I. main.cpp WindowManager.cpp GameDataInterface.cpp CoachingInterface.cpp user32.lib gdi32.lib kernel32.lib comctl32.lib ole32.lib oleaut32.lib uuid.lib advapi32.lib shell32.lib psapi.lib /Fe:CoachClippiWrapper.exe
   ```

## What You'll Get

After building successfully, you'll have:
- `CoachClippiWrapper.exe` - The main application
- The app will automatically look for `overlay.dll` in the same directory

## Next Steps After Building

1. **Copy overlay.dll:**
   ```powershell
   copy "..\..\build\overlay.dll" "build\bin\Release\"
   ```

2. **Run the application:**
   - Start Slippi Dolphin first
   - Run `CoachClippiWrapper.exe`
   - The app will detect and embed the game window

## Troubleshooting

- **"CMake not found"**: Install CMake from the official website
- **"Visual Studio not found"**: Install Visual Studio Community (free)
- **Build errors**: Make sure you have Windows 10 SDK installed
- **Missing overlay.dll**: Copy it from your build directory to the executable directory
