#include "WindowManager.h"
#include <iostream>
#include <algorithm>
#include <tlhelp32.h>

WindowManager::WindowManager() {
    std::wcout << L"WindowManager initialized" << std::endl;
}

WindowManager::~WindowManager() {
    // Restore all embedded windows
    for (const auto& info : m_embeddedWindows) {
        RestoreWindowState(info);
    }
    m_embeddedWindows.clear();
}

HWND WindowManager::FindGameWindow() {
    std::vector<WindowInfo> windows = EnumerateWindows();
    
    // Look for Slippi first, then Dolphin
    for (const auto& window : windows) {
        if (IsSlippiWindow(window) || IsDolphinWindow(window)) {
            if (IsValidGameWindow(window.hwnd)) {
                std::wcout << L"Found game window: " << window.title << std::endl;
                return window.hwnd;
            }
        }
    }
    
    return nullptr;
}

bool WindowManager::EmbedGameWindow(HWND parentWindow, HWND gameWindow) {
    std::wcout << L"=== Starting Window Embedding Process ===" << std::endl;
    std::wcout << L"Parent window: " << (void*)parentWindow << std::endl;
    std::wcout << L"Game window: " << (void*)gameWindow << std::endl;
    
    // Validate input windows
    if (!IsWindow(gameWindow)) {
        std::wcout << L"ERROR: Game window handle is invalid!" << std::endl;
        return false;
    }
    
    if (!IsWindow(parentWindow)) {
        std::wcout << L"ERROR: Parent window handle is invalid!" << std::endl;
        return false;
    }
    
    // Get window information for debugging
    wchar_t gameTitle[256] = {0};
    wchar_t parentTitle[256] = {0};
    GetWindowText(gameWindow, gameTitle, 256);
    GetWindowText(parentWindow, parentTitle, 256);
    
    std::wcout << L"Game window title: '" << gameTitle << L"'" << std::endl;
    std::wcout << L"Parent window title: '" << parentTitle << L"'" << std::endl;
    
    // Check if already embedded
    for (const auto& info : m_embeddedWindows) {
        if (info.gameWindow == gameWindow) {
            std::wcout << L"Window is already embedded, returning success" << std::endl;
            return true; // Already embedded
        }
    }
    
    // Get original window rectangles for debugging
    RECT gameRect, parentRect;
    GetWindowRect(gameWindow, &gameRect);
    GetWindowRect(parentWindow, &parentRect);
    
    std::wcout << L"Game window rect: (" << gameRect.left << L"," << gameRect.top 
              << L") to (" << gameRect.right << L"," << gameRect.bottom << L")" << std::endl;
    std::wcout << L"Parent window rect: (" << parentRect.left << L"," << parentRect.top 
              << L") to (" << parentRect.right << L"," << parentRect.bottom << L")" << std::endl;
    
    EmbeddedWindowInfo embedInfo = {};
    embedInfo.gameWindow = gameWindow;
    
    // Save current window state
    std::wcout << L"Saving original window state..." << std::endl;
    SaveWindowState(gameWindow, embedInfo);
    
    // Clear any previous error
    SetLastError(0);
    
    // Set new parent
    std::wcout << L"Setting parent window..." << std::endl;
    HWND oldParent = SetParent(gameWindow, parentWindow);
    DWORD lastError = GetLastError();
    
    if (!oldParent && lastError != 0) {
        std::wcout << L"ERROR: Failed to set parent window! Error code: " << lastError << std::endl;
        
        // Try to get more information about the error
        LPWSTR errorMsg = nullptr;
        FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM,
                     nullptr, lastError, 0, (LPWSTR)&errorMsg, 0, nullptr);
        if (errorMsg) {
            std::wcout << L"Error message: " << errorMsg << std::endl;
            LocalFree(errorMsg);
        }
        return false;
    }
    
    std::wcout << L"Parent set successfully. Old parent was: " << (void*)oldParent << std::endl;
    
    // Apply embedded window style
    std::wcout << L"Applying embedded window styles..." << std::endl;
    ApplyEmbeddedStyle(gameWindow);
    
    // Get the parent's client area and position the game window
    RECT parentClientRect;
    if (GetClientRect(parentWindow, &parentClientRect)) {
        int clientWidth = parentClientRect.right - parentClientRect.left;
        int clientHeight = parentClientRect.bottom - parentClientRect.top;
        
        std::wcout << L"Parent client area: " << clientWidth << L"x" << clientHeight << std::endl;
        
        // Position and size the game window to fill the parent's client area
        if (SetWindowPos(gameWindow, HWND_BOTTOM, 0, 0, clientWidth, clientHeight,
                        SWP_NOACTIVATE | SWP_SHOWWINDOW)) {
            std::wcout << L"Game window positioned and sized successfully" << std::endl;
        } else {
            std::wcout << L"WARNING: Failed to position game window, error: " << GetLastError() << std::endl;
        }
    } else {
        std::wcout << L"WARNING: Could not get parent client rect, error: " << GetLastError() << std::endl;
    }
    
    // Store the embedding info
    m_embeddedWindows.push_back(embedInfo);
    
    // Force a redraw of both windows
    InvalidateRect(parentWindow, nullptr, TRUE);
    InvalidateRect(gameWindow, nullptr, TRUE);
    UpdateWindow(parentWindow);
    UpdateWindow(gameWindow);
    
    std::wcout << L"Game window embedded successfully!" << std::endl;
    std::wcout << L"Total embedded windows: " << m_embeddedWindows.size() << std::endl;
    std::wcout << L"=========================================" << std::endl;
    
    return true;
}

bool WindowManager::RestoreGameWindow(HWND gameWindow) {
    auto it = std::find_if(m_embeddedWindows.begin(), m_embeddedWindows.end(),
        [gameWindow](const EmbeddedWindowInfo& info) {
            return info.gameWindow == gameWindow;
        });
    
    if (it != m_embeddedWindows.end()) {
        RestoreWindowState(*it);
        m_embeddedWindows.erase(it);
        std::wcout << L"Game window restored" << std::endl;
        return true;
    }
    
    return false;
}

std::vector<WindowInfo> WindowManager::EnumerateWindows() {
    std::vector<WindowInfo> windows;
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&windows));
    return windows;
}

BOOL CALLBACK WindowManager::EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    auto* windows = reinterpret_cast<std::vector<WindowInfo>*>(lParam);
    
    if (::IsWindowVisible(hwnd)) {
        WindowInfo info;
        info.hwnd = hwnd;
        
        // Get window title
        wchar_t title[256];
        int titleLength = GetWindowText(hwnd, title, sizeof(title) / sizeof(wchar_t));
        info.title = std::wstring(title, titleLength);
        
        // Get window class name
        wchar_t className[256];
        int classLength = GetClassName(hwnd, className, sizeof(className) / sizeof(wchar_t));
        info.className = std::wstring(className, classLength);
        
        // Get process ID
        GetWindowThreadProcessId(hwnd, &info.processId);
        
        if (!info.title.empty()) {
            windows->push_back(info);
        }
    }
    
    return TRUE;
}

bool WindowManager::IsSlippiWindow(const WindowInfo& windowInfo) {
    // Only detect actual Dolphin game windows, not the Slippi launcher
    std::wstring title = windowInfo.title;
    std::wstring className = windowInfo.className;
    
    // Convert to lowercase for case-insensitive comparison
    std::transform(title.begin(), title.end(), title.begin(), ::towlower);
    std::transform(className.begin(), className.end(), className.begin(), ::towlower);
    
    // Exclude Slippi launcher specifically
    if (title.find(L"slippi launcher") != std::wstring::npos ||
        title.find(L"project slippi") != std::wstring::npos ||
        className.find(L"electron") != std::wstring::npos ||
        className.find(L"chrome") != std::wstring::npos) {
        return false;  // Skip launcher windows
    }
    
    // Only accept actual Dolphin game windows with Slippi
    return (title.find(L"dolphin") != std::wstring::npos && 
            (title.find(L"fps") != std::wstring::npos || 
             title.find(L"melee") != std::wstring::npos ||
             title.find(L"ssbm") != std::wstring::npos)) ||
           (className == L"dolphinclass");
}

bool WindowManager::IsDolphinWindow(const WindowInfo& windowInfo) {
    std::wstring title = windowInfo.title;
    std::wstring className = windowInfo.className;
    
    // Convert to lowercase for case-insensitive comparison
    std::transform(title.begin(), title.end(), title.begin(), ::towlower);
    std::transform(className.begin(), className.end(), className.begin(), ::towlower);
    
    // STRICT exclusion of launcher windows and other non-game windows
    if (title.find(L"slippi launcher") != std::wstring::npos ||
        title.find(L"project slippi") != std::wstring::npos ||
        title.find(L"launcher") != std::wstring::npos ||
        className.find(L"electron") != std::wstring::npos ||
        className.find(L"chrome") != std::wstring::npos ||
        className.find(L"cefclient") != std::wstring::npos ||
        className.find(L"applicationframehost") != std::wstring::npos ||
        className.find(L"dwm") != std::wstring::npos ||
        title.find(L"desktop") != std::wstring::npos ||
        title.find(L"taskbar") != std::wstring::npos) {
        return false;  // Exclude launcher and system windows
    }
    
    // Enhanced detection patterns for different Dolphin/Slippi configurations
    bool isSlippiDolphin = false;
    bool isDolphinExecutable = false;
    
    // Slippi-specific patterns
    if ((title.find(L"faster melee") != std::wstring::npos && title.find(L"slippi") != std::wstring::npos) ||
        (title.find(L"slippi") != std::wstring::npos && title.find(L"melee") != std::wstring::npos) ||
        (title.find(L"slippi") != std::wstring::npos && title.find(L"ssbm") != std::wstring::npos) ||
        (className == L"wxwindownr") ||  // Common Slippi class name
        (className == L"wxwindowclassnr")) {  // Alternative Slippi class name
        isSlippiDolphin = true;
    }
    
    // Traditional Dolphin patterns
    if ((className == L"dolphinclass") ||
        (className == L"dolphin-emu") ||
        (className == L"dolphinwx") ||
        (title.find(L"dolphin") != std::wstring::npos && 
         (title.find(L"fps") != std::wstring::npos || 
          title.find(L"melee") != std::wstring::npos ||
          title.find(L"ssbm") != std::wstring::npos ||
          title.find(L"gamecube") != std::wstring::npos))) {
        isDolphinExecutable = true;
    }
    
    // Accept either Slippi Dolphin or traditional Dolphin
    bool isValidDolphin = isSlippiDolphin || isDolphinExecutable;
    
    // Enhanced window size validation
    RECT windowRect;
    if (!GetWindowRect(windowInfo.hwnd, &windowRect)) {
        return false;  // Can't get window rect
    }
    
    int width = windowRect.right - windowRect.left;
    int height = windowRect.bottom - windowRect.top;
    
    // More flexible size requirements - accept common game window sizes
    bool isGameSize = (width >= 320 && height >= 240 &&  // Minimum reasonable game size
                       width <= 1920 && height <= 1080);  // Maximum reasonable size
    
    // Additional validation - check if window is actually visible and has content
    bool isActuallyVisible = IsWindowVisible(windowInfo.hwnd) && 
                            !IsIconic(windowInfo.hwnd) &&  // Not minimized
                            GetWindowLong(windowInfo.hwnd, GWL_STYLE) & WS_VISIBLE;
    
    // Check if window has a valid client area
    RECT clientRect;
    bool hasClientArea = GetClientRect(windowInfo.hwnd, &clientRect) && 
                        (clientRect.right > 0 && clientRect.bottom > 0);
    
    // Enhanced debug output with more information
    if (isValidDolphin || title.find(L"melee") != std::wstring::npos || 
        title.find(L"slippi") != std::wstring::npos || title.find(L"dolphin") != std::wstring::npos) {
        std::wcout << L"=== Window Detection Debug ===" << std::endl;
        std::wcout << L"Title: '" << windowInfo.title.c_str() << L"'" << std::endl;
        std::wcout << L"Class: '" << windowInfo.className.c_str() << L"'" << std::endl;
        std::wcout << L"HWND: " << windowInfo.hwnd << std::endl;
        std::wcout << L"Size: " << width << L"x" << height << std::endl;
        std::wcout << L"Position: (" << windowRect.left << L"," << windowRect.top << L")" << std::endl;
        std::wcout << L"Process ID: " << windowInfo.processId << std::endl;
        std::wcout << L"isSlippiDolphin: " << (isSlippiDolphin ? L"YES" : L"NO") << std::endl;
        std::wcout << L"isDolphinExecutable: " << (isDolphinExecutable ? L"YES" : L"NO") << std::endl;
        std::wcout << L"isGameSize: " << (isGameSize ? L"YES" : L"NO") << std::endl;
        std::wcout << L"isActuallyVisible: " << (isActuallyVisible ? L"YES" : L"NO") << std::endl;
        std::wcout << L"hasClientArea: " << (hasClientArea ? L"YES" : L"NO") << std::endl;
        
        bool finalResult = isValidDolphin && isGameSize && isActuallyVisible && hasClientArea;
        std::wcout << L"FINAL RESULT: " << (finalResult ? L"MATCH!" : L"NO MATCH") << std::endl;
        std::wcout << L"==============================" << std::endl;
    }
    
    return isValidDolphin && isGameSize && isActuallyVisible && hasClientArea;
}

bool WindowManager::IsValidGameWindow(HWND hwnd) {
    if (!IsWindow(hwnd) || !IsWindowVisible(hwnd)) {
        return false;
    }
    
    // Check window size - game windows should be reasonably sized
    RECT rect;
    GetWindowRect(hwnd, &rect);
    int width = rect.right - rect.left;
    int height = rect.bottom - rect.top;
    
    // Minimum size check (should be at least 400x300)
    if (width < 400 || height < 300) {
        return false;
    }
    
    // Check if window has a visible client area
    RECT clientRect;
    GetClientRect(hwnd, &clientRect);
    return (clientRect.right > 0 && clientRect.bottom > 0);
}

void WindowManager::UpdateGameWindowPosition(HWND parentWindow, HWND gameWindow, const RECT& gameArea) {
    if (!IsWindow(gameWindow)) {
        return;
    }
    
    SetWindowPos(gameWindow, HWND_BOTTOM,
                gameArea.left, gameArea.top,
                gameArea.right - gameArea.left,
                gameArea.bottom - gameArea.top,
                SWP_NOACTIVATE | SWP_NOOWNERZORDER);
    
    // Synchronize refresh after positioning
    SynchronizeWindowRefresh(parentWindow, gameWindow);
}

void WindowManager::SynchronizeWindowRefresh(HWND containerWindow, HWND gameWindow) {
    if (!IsWindow(containerWindow) || !IsWindow(gameWindow)) {
        return;
    }
    
    // Force both windows to refresh in the correct order
    // First invalidate the game window (child)
    InvalidateRect(gameWindow, nullptr, FALSE);
    
    // Then invalidate the container window (parent)
    InvalidateRect(containerWindow, nullptr, FALSE);
    
    // Update the game window first (child renders first)
    UpdateWindow(gameWindow);
    
    // Then update the container window (parent renders on top)
    UpdateWindow(containerWindow);
    
    // Additional step: ensure proper Z-order is maintained
    SetWindowPos(gameWindow, HWND_BOTTOM, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER);
}

RECT WindowManager::GetOriginalWindowRect(HWND window) {
    RECT rect = {};
    GetWindowRect(window, &rect);
    return rect;
}

void WindowManager::SaveWindowState(HWND window, EmbeddedWindowInfo& info) {
    info.originalParent = GetParent(window);
    info.originalStyle = GetWindowLong(window, GWL_STYLE);
    info.originalExStyle = GetWindowLong(window, GWL_EXSTYLE);
    GetWindowRect(window, &info.originalRect);
    
    // Check if maximized
    WINDOWPLACEMENT placement = {};
    placement.length = sizeof(WINDOWPLACEMENT);
    GetWindowPlacement(window, &placement);
    info.wasMaximized = (placement.showCmd == SW_SHOWMAXIMIZED);
}

void WindowManager::RestoreWindowState(const EmbeddedWindowInfo& info) {
    if (!IsWindow(info.gameWindow)) {
        return;
    }
    
    // Restore parent
    SetParent(info.gameWindow, info.originalParent);
    
    // Restore window styles
    SetWindowLong(info.gameWindow, GWL_STYLE, info.originalStyle);
    SetWindowLong(info.gameWindow, GWL_EXSTYLE, info.originalExStyle);
    
    // Restore position and size
    SetWindowPos(info.gameWindow, nullptr,
                info.originalRect.left, info.originalRect.top,
                info.originalRect.right - info.originalRect.left,
                info.originalRect.bottom - info.originalRect.top,
                SWP_NOZORDER | SWP_FRAMECHANGED);
    
    // Restore maximized state if needed
    if (info.wasMaximized) {
        ShowWindow(info.gameWindow, SW_SHOWMAXIMIZED);
    }
}

void WindowManager::ApplyEmbeddedStyle(HWND window) {
    std::wcout << L"Applying embedded window styles..." << std::endl;
    
    // Remove window decorations for embedding
    LONG style = GetWindowLong(window, GWL_STYLE);
    style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU | WS_BORDER);
    style |= WS_CHILD | WS_CLIPSIBLINGS;  // Add WS_CLIPSIBLINGS to prevent sibling interference
    SetWindowLong(window, GWL_STYLE, style);
    
    // Update extended style - remove problematic styles
    LONG exStyle = GetWindowLong(window, GWL_EXSTYLE);
    exStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_WINDOWEDGE | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE | 
                 WS_EX_OVERLAPPEDWINDOW | WS_EX_PALETTEWINDOW);
    SetWindowLong(window, GWL_EXSTYLE, exStyle);
    
    std::wcout << L"Applied styles - WS_CHILD | WS_CLIPSIBLINGS" << std::endl;
    
    // Apply changes with proper flags for embedded windows
    SetWindowPos(window, HWND_BOTTOM, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_NOOWNERZORDER);
    
    std::wcout << L"Window positioned at HWND_BOTTOM with proper flags" << std::endl;
}

std::wstring WindowManager::GetWindowTitle(HWND hwnd) {
    wchar_t title[256];
    int length = GetWindowText(hwnd, title, sizeof(title) / sizeof(wchar_t));
    return std::wstring(title, length);
}

std::wstring WindowManager::GetWindowClassName(HWND hwnd) {
    wchar_t className[256];
    int length = GetClassName(hwnd, className, sizeof(className) / sizeof(wchar_t));
    return std::wstring(className, length);
}

DWORD WindowManager::GetWindowProcessId(HWND hwnd) {
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    return processId;
}

bool WindowManager::IsWindowVisible(HWND hwnd) {
    return ::IsWindowVisible(hwnd) != FALSE;
}
