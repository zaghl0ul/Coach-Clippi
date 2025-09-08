#pragma once
#include <windows.h>
#include <string>
#include <vector>

struct WindowInfo {
    HWND hwnd;
    std::wstring title;
    std::wstring className;
    DWORD processId;
};

class WindowManager {
public:
    WindowManager();
    ~WindowManager();
    
    // Game window detection and management
    HWND FindGameWindow();
    bool EmbedGameWindow(HWND parentWindow, HWND gameWindow);
    bool RestoreGameWindow(HWND gameWindow);
    
    // Window enumeration and utilities
    std::vector<WindowInfo> EnumerateWindows();
    bool IsSlippiWindow(const WindowInfo& windowInfo);
    bool IsDolphinWindow(const WindowInfo& windowInfo);
    
    // Window positioning and sizing
    void UpdateGameWindowPosition(HWND parentWindow, HWND gameWindow, const RECT& gameArea);
    void SynchronizeWindowRefresh(HWND containerWindow, HWND gameWindow);
    RECT GetOriginalWindowRect(HWND window);
    
private:
    struct EmbeddedWindowInfo {
        HWND gameWindow;
        HWND originalParent;
        LONG originalStyle;
        LONG originalExStyle;
        RECT originalRect;
        bool wasMaximized;
    };
    
    std::vector<EmbeddedWindowInfo> m_embeddedWindows;
    
    // Helper methods
    static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam);
    bool IsValidGameWindow(HWND hwnd);
    std::wstring GetWindowTitle(HWND hwnd);
    std::wstring GetWindowClassName(HWND hwnd);
    DWORD GetWindowProcessId(HWND hwnd);
    bool IsWindowVisible(HWND hwnd);
    
    // Window style management
    void SaveWindowState(HWND window, EmbeddedWindowInfo& info);
    void RestoreWindowState(const EmbeddedWindowInfo& info);
    void ApplyEmbeddedStyle(HWND window);
};
