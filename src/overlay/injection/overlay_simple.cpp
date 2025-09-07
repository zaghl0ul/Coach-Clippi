// Simplified Overlay DLL - With Visual Rendering
#include <windows.h>
#include <string>
#include <queue>
#include <mutex>
#include <thread>
#include <memory>
#include <vector>
#include <chrono>
#include <gdiplus.h>
#include "overlay_simple.h"

#pragma comment(lib, "gdiplus.lib")

using namespace Gdiplus;

// Message structure with timing
struct ActiveMessage {
    std::string text;
    DWORD startTime;
    DWORD duration;
    MessagePosition position;
    MessageCategory category;
    MessagePriority priority;
    float alpha;
};

// Forward declarations
void FillRoundedRectangle(Graphics* g, Brush* brush, RectF rect, float radius);
void DrawRoundedRectangle(Graphics* g, Pen* pen, RectF rect, float radius);

// Global overlay instance
std::unique_ptr<OverlayRenderer> g_overlay;
std::mutex g_messageMutex;
std::queue<OverlayMessage> g_messageQueue;
std::vector<ActiveMessage> g_activeMessages;
HANDLE g_communicationThread = NULL;
HANDLE g_renderThread = NULL;
HANDLE g_windowTrackingThread = NULL;
HANDLE g_pipeSemaphore = NULL;
HWND g_overlayWindow = NULL;
HWND g_targetWindow = NULL;
bool g_running = true;
bool g_showBorder = true;
ULONG_PTR g_gdiplusToken = 0;

// Communication thread
DWORD WINAPI CommunicationThread(LPVOID param) {
    // Wait a bit for the main process to set up the pipe
    Sleep(1000);
    
    HANDLE hPipe = INVALID_HANDLE_VALUE;
    
    while (g_running && hPipe == INVALID_HANDLE_VALUE) {
        hPipe = CreateFileA(
            "\\\\.\\pipe\\CoachClippiOverlay",
            GENERIC_READ | GENERIC_WRITE,
            0,
            NULL,
            OPEN_EXISTING,
            0,
            NULL
        );
        
        if (hPipe == INVALID_HANDLE_VALUE) {
            Sleep(500); // Wait before retrying
        }
    }
    
    if (hPipe == INVALID_HANDLE_VALUE) {
        return 1;
    }
    
    // Set pipe to message mode
    DWORD mode = PIPE_READMODE_MESSAGE;
    SetNamedPipeHandleState(hPipe, &mode, NULL, NULL);
    
    char buffer[4096];
    DWORD bytesRead;
    
    while (g_running) {
        if (ReadFile(hPipe, buffer, sizeof(buffer) - 1, &bytesRead, NULL)) {
            buffer[bytesRead] = '\0';
            
            // Parse message and add to queue
            OverlayMessage msg;
            msg.text = buffer;
            msg.duration = 5000;
            msg.position = MessagePosition::TOP_RIGHT;
            msg.category = MessageCategory::GENERAL;
            msg.priority = MessagePriority::NORMAL;
            
            std::lock_guard<std::mutex> lock(g_messageMutex);
            g_messageQueue.push(msg);
            
            // Signal that we received a message (for debugging)
            OutputDebugStringA("[CoachClippi] Received message: ");
            OutputDebugStringA(buffer);
            OutputDebugStringA("\n");
        } else {
            DWORD error = GetLastError();
            if (error == ERROR_BROKEN_PIPE) {
                // Pipe was closed, try to reconnect
                CloseHandle(hPipe);
                hPipe = INVALID_HANDLE_VALUE;
                
                while (g_running && hPipe == INVALID_HANDLE_VALUE) {
                    hPipe = CreateFileA(
                        "\\\\.\\pipe\\CoachClippiOverlay",
                        GENERIC_READ | GENERIC_WRITE,
                        0,
                        NULL,
                        OPEN_EXISTING,
                        0,
                        NULL
                    );
                    
                    if (hPipe == INVALID_HANDLE_VALUE) {
                        Sleep(500);
                    }
                }
                
                if (hPipe != INVALID_HANDLE_VALUE) {
                    SetNamedPipeHandleState(hPipe, &mode, NULL, NULL);
                }
            }
        }
        
        Sleep(10);
    }
    
    if (hPipe != INVALID_HANDLE_VALUE) {
        CloseHandle(hPipe);
    }
    
    return 0;
}

// Window procedure for overlay window
LRESULT CALLBACK OverlayWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        
        // Set up GDI+ graphics
        Graphics graphics(hdc);
        graphics.SetSmoothingMode(SmoothingModeAntiAlias);
        graphics.SetTextRenderingHint(TextRenderingHintAntiAlias);
        
        // Clear the window with transparent background
        graphics.Clear(Color(0, 0, 0, 0));
        
        // Render active messages
        std::lock_guard<std::mutex> lock(g_messageMutex);
        DWORD currentTime = GetTickCount();
        
        int yOffset = 10;
        for (auto it = g_activeMessages.begin(); it != g_activeMessages.end();) {
            if (currentTime - it->startTime > it->duration) {
                it = g_activeMessages.erase(it);
                continue;
            }
            
            // Calculate fade effect
            float timeProgress = (float)(currentTime - it->startTime) / it->duration;
            float alpha = 1.0f;
            if (timeProgress > 0.8f) {
                alpha = 1.0f - ((timeProgress - 0.8f) / 0.2f);
            }
            alpha = max(0.0f, min(1.0f, alpha));
            
            // Slippi's signature green color with advanced rendering
            // Main Slippi green: #21ba45 (RGB: 33, 186, 69)
            BYTE baseAlpha = (BYTE)(240 * alpha);
            BYTE glowAlpha = (BYTE)(120 * alpha);
            
            // Create gradient brush for glass morphism effect
            LinearGradientBrush gradientBrush(
                PointF(0, 0), 
                PointF(0, 50),
                Color(baseAlpha, 33, 186, 69),  // Slippi green
                Color((BYTE)(baseAlpha * 0.8f), 25, 140, 52)  // Darker green gradient
            );
            
            // Glow effect with Slippi green
            Pen glowPen(Color(glowAlpha, 33, 255, 80), 8.0f);  // Outer glow
            Pen borderPen(Color((BYTE)(255 * alpha), 15, 100, 30), 3.0f);  // Dark green border
            Pen innerGlowPen(Color((BYTE)(80 * alpha), 100, 255, 150), 2.0f);  // Inner light green accent
            
            // Get text dimensions with larger font
            std::wstring wtext(it->text.begin(), it->text.end());
            FontFamily fontFamily(L"Arial");
            Font font(&fontFamily, 24, FontStyleBold, UnitPixel); // Larger, bold font
            
            RectF textRect;
            graphics.MeasureString(wtext.c_str(), -1, &font, PointF(0, 0), &textRect);
            
            // Position based on message position setting - make more prominent
            float x = 50, y = 50 + yOffset; // Start further from edges
            if (it->position == MessagePosition::TOP_RIGHT) {
                RECT clientRect;
                GetClientRect(hwnd, &clientRect);
                x = clientRect.right - textRect.Width - 80; // More padding from right edge
            } else if (it->position == MessagePosition::MIDDLE_CENTER) {
                RECT clientRect;
                GetClientRect(hwnd, &clientRect);
                x = (clientRect.right - textRect.Width) / 2;
                y = (clientRect.bottom - textRect.Height) / 2;
            }
            
            // Draw advanced bubble with glass morphism and glow effects
            RectF bubbleRect(x - 25, y - 18, textRect.Width + 50, textRect.Height + 36);
            
            // Draw outer glow
            RectF glowRect(bubbleRect.X - 3, bubbleRect.Y - 3, bubbleRect.Width + 6, bubbleRect.Height + 6);
            DrawRoundedRectangle(&graphics, &glowPen, glowRect, 18);
            
            // Fill main bubble with gradient
            FillRoundedRectangle(&graphics, &gradientBrush, bubbleRect, 15);
            
            // Draw border
            DrawRoundedRectangle(&graphics, &borderPen, bubbleRect, 15);
            
            // Add inner glow accent
            RectF innerRect(bubbleRect.X + 2, bubbleRect.Y + 2, bubbleRect.Width - 4, bubbleRect.Height - 4);
            DrawRoundedRectangle(&graphics, &innerGlowPen, innerRect, 13);
            
            // Add subtle pulse animation based on message age
            float pulse = sin(timeProgress * 3.14159f * 2) * 0.1f + 1.0f;
            graphics.ScaleTransform(pulse, pulse);
            
            // Draw text with enhanced visibility and shadow
            // Text shadow for depth
            SolidBrush shadowBrush(Color((BYTE)(150 * alpha), 0, 0, 0));
            graphics.DrawString(wtext.c_str(), -1, &font, PointF(x + 2, y + 2), &shadowBrush);
            
            // Main text in bright white for maximum contrast against green
            SolidBrush textBrush(Color((BYTE)(255 * alpha), 255, 255, 255));
            graphics.DrawString(wtext.c_str(), -1, &font, PointF(x, y), &textBrush);
            
            // Reset transform after pulse
            graphics.ResetTransform();
            
            yOffset += (int)textRect.Height + 50; // More spacing between messages
            ++it;
        }
        
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    default:
        return DefWindowProc(hwnd, msg, wParam, lParam);
    }
}

// Window tracking thread - continuously updates overlay position to follow Dolphin
DWORD WINAPI WindowTrackingThread(LPVOID param) {
    OutputDebugStringA("[CoachClippi] Window tracking thread started\n");
    
    while (g_running) {
        if (g_overlayWindow && g_targetWindow) {
            // Check if target window still exists
            if (IsWindow(g_targetWindow)) {
                RECT targetRect;
                if (GetWindowRect(g_targetWindow, &targetRect)) {
                    // Update overlay position and size to match target
                    SetWindowPos(g_overlayWindow, HWND_TOPMOST,
                        targetRect.left, targetRect.top,
                        targetRect.right - targetRect.left,
                        targetRect.bottom - targetRect.top,
                        SWP_NOACTIVATE | SWP_SHOWWINDOW);
                    
                    // Trigger repaint to draw border if needed
                    if (g_showBorder) {
                        InvalidateRect(g_overlayWindow, NULL, TRUE);
                    }
                }
            } else {
                // Target window closed, try to find it again
                g_targetWindow = FindWindowA(NULL, "Dolphin");
                if (!g_targetWindow) {
                    g_targetWindow = FindWindowA(NULL, "Slippi Dolphin");
                }
                if (!g_targetWindow) {
                    g_targetWindow = FindWindowA("DolphinClass", NULL);
                }
            }
        }
        
        Sleep(50); // Update position 20 times per second
    }
    
    OutputDebugStringA("[CoachClippi] Window tracking thread ended\n");
    return 0;
}

// Create a transparent overlay window
HWND CreateOverlayWindow() {
    WNDCLASSEXW wc = { 0 };
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = OverlayWndProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(NULL_BRUSH);
    wc.lpszClassName = L"CoachClippiOverlay";
    
    RegisterClassExW(&wc);
    
    // Get the target window (Dolphin) - try multiple methods
    g_targetWindow = FindWindowA(NULL, "Slippi Dolphin");  // Try exact title first
    if (!g_targetWindow) {
        g_targetWindow = FindWindowA(NULL, "Dolphin");
    }
    if (!g_targetWindow) {
        g_targetWindow = FindWindowA("DolphinClass", NULL);
    }
    if (!g_targetWindow) {
        // Try to find any window with "Slippi" or "Dolphin" in the title
        HWND hwnd = GetTopWindow(NULL);
        while (hwnd) {
            char windowTitle[256];
            GetWindowTextA(hwnd, windowTitle, sizeof(windowTitle));
            if (strstr(windowTitle, "Slippi") != NULL || strstr(windowTitle, "Dolphin") != NULL) {
                g_targetWindow = hwnd;
                OutputDebugStringA("[CoachClippi] Found window with title: ");
                OutputDebugStringA(windowTitle);
                OutputDebugStringA("\n");
                break;
            }
            hwnd = GetNextWindow(hwnd, GW_HWNDNEXT);
        }
    }
    
    RECT rect = { 100, 100, 900, 700 }; // Default fallback size
    if (g_targetWindow) {
        GetWindowRect(g_targetWindow, &rect);
        OutputDebugStringA("[CoachClippi] Found Dolphin window, overlaying on top\n");
    } else {
        OutputDebugStringA("[CoachClippi] Dolphin window not found, using default position\n");
    }
    
    HWND hwnd = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"CoachClippiOverlay",
        L"Coach Clippi Overlay",
        WS_POPUP,
        rect.left, rect.top,
        rect.right - rect.left,
        rect.bottom - rect.top,
        NULL, NULL,
        GetModuleHandle(NULL),
        NULL
    );
    
    if (hwnd) {
        // Make window layered and set transparency
        SetLayeredWindowAttributes(hwnd, RGB(0, 0, 0), 0, LWA_COLORKEY);
        ShowWindow(hwnd, SW_SHOW);
        UpdateWindow(hwnd);
        OutputDebugStringA("[CoachClippi] Overlay window created and shown\n");
    } else {
        OutputDebugStringA("[CoachClippi] Failed to create overlay window\n");
    }
    
    return hwnd;
}

// Rendering thread function
DWORD WINAPI RenderThread(LPVOID param) {
    OutputDebugStringA("[CoachClippi] Render thread started\n");
    
    // Create overlay window
    g_overlayWindow = CreateOverlayWindow();
    if (!g_overlayWindow) {
        OutputDebugStringA("[CoachClippi] Failed to create overlay window\n");
        return 1;
    }
    
    // Message processing loop
    MSG msg;
    while (g_running) {
        // Process window messages
        while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }
        
        // Check for new messages to display
        {
            std::lock_guard<std::mutex> lock(g_messageMutex);
            while (!g_messageQueue.empty()) {
                OverlayMessage overlayMsg = g_messageQueue.front();
                g_messageQueue.pop();
                
                ActiveMessage activeMsg;
                activeMsg.text = overlayMsg.text;
                activeMsg.startTime = GetTickCount();
                activeMsg.duration = overlayMsg.duration;
                activeMsg.position = overlayMsg.position;
                activeMsg.category = overlayMsg.category;
                activeMsg.priority = overlayMsg.priority;
                activeMsg.alpha = 1.0f;
                
                g_activeMessages.push_back(activeMsg);
                
                OutputDebugStringA("[CoachClippi] Added message to active display: ");
                OutputDebugStringA(overlayMsg.text.c_str());
                OutputDebugStringA("\n");
            }
        }
        
        // Trigger repaint if we have active messages
        if (!g_activeMessages.empty()) {
            InvalidateRect(g_overlayWindow, NULL, TRUE);
        }
        
        Sleep(16); // ~60 FPS
    }
    
    if (g_overlayWindow) {
        DestroyWindow(g_overlayWindow);
        g_overlayWindow = NULL;
    }
    
    OutputDebugStringA("[CoachClippi] Render thread ended\n");
    return 0;
}

// GDI+ helper functions for rounded rectangles
void DrawRoundedRectangle(Graphics* g, Pen* pen, RectF rect, float radius) {
    GraphicsPath path;
    path.AddArc(rect.X, rect.Y, radius * 2, radius * 2, 180, 90);
    path.AddArc(rect.X + rect.Width - radius * 2, rect.Y, radius * 2, radius * 2, 270, 90);
    path.AddArc(rect.X + rect.Width - radius * 2, rect.Y + rect.Height - radius * 2, radius * 2, radius * 2, 0, 90);
    path.AddArc(rect.X, rect.Y + rect.Height - radius * 2, radius * 2, radius * 2, 90, 90);
    path.CloseFigure();
    g->DrawPath(pen, &path);
}

void FillRoundedRectangle(Graphics* g, Brush* brush, RectF rect, float radius) {
    GraphicsPath path;
    path.AddArc(rect.X, rect.Y, radius * 2, radius * 2, 180, 90);
    path.AddArc(rect.X + rect.Width - radius * 2, rect.Y, radius * 2, radius * 2, 270, 90);
    path.AddArc(rect.X + rect.Width - radius * 2, rect.Y + rect.Height - radius * 2, radius * 2, radius * 2, 0, 90);
    path.AddArc(rect.X, rect.Y + rect.Height - radius * 2, radius * 2, radius * 2, 90, 90);
    path.CloseFigure();
    g->FillPath(brush, &path);
}

// DLL entry point
BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID reserved) {
    switch (reason) {
    case DLL_PROCESS_ATTACH:
        {
            DisableThreadLibraryCalls(hModule);
            
            OutputDebugStringA("[CoachClippi] DLL Attached to process\n");
            
            // Initialize GDI+
            GdiplusStartupInput gdiplusStartupInput;
            GdiplusStartup(&g_gdiplusToken, &gdiplusStartupInput, NULL);
            
            // Initialize overlay
            g_overlay = std::make_unique<OverlayRenderer>();
            g_overlay->Initialize();
            
            // Start communication thread
            g_communicationThread = CreateThread(NULL, 0, CommunicationThread, NULL, 0, NULL);
            
            // Start rendering thread
            g_renderThread = CreateThread(NULL, 0, RenderThread, NULL, 0, NULL);
            
            // Start window tracking thread
            g_windowTrackingThread = CreateThread(NULL, 0, WindowTrackingThread, NULL, 0, NULL);
            
            // Create semaphore to signal successful injection
            g_pipeSemaphore = CreateSemaphoreA(NULL, 0, 1, "CoachClippiOverlayReady");
            if (g_pipeSemaphore) {
                ReleaseSemaphore(g_pipeSemaphore, 1, NULL);
            }
            
            OutputDebugStringA("[CoachClippi] Initialization complete\n");
            break;
        }
        
    case DLL_PROCESS_DETACH:
        {
            OutputDebugStringA("[CoachClippi] DLL Detaching from process\n");
            
            g_running = false;
            
            if (g_communicationThread) {
                WaitForSingleObject(g_communicationThread, 2000);
                CloseHandle(g_communicationThread);
            }
            
            if (g_renderThread) {
                WaitForSingleObject(g_renderThread, 2000);
                CloseHandle(g_renderThread);
            }
            
            if (g_windowTrackingThread) {
                WaitForSingleObject(g_windowTrackingThread, 2000);
                CloseHandle(g_windowTrackingThread);
            }
            
            if (g_overlayWindow) {
                DestroyWindow(g_overlayWindow);
                g_overlayWindow = NULL;
            }
            
            if (g_pipeSemaphore) {
                CloseHandle(g_pipeSemaphore);
            }
            
            // Cleanup overlay
            if (g_overlay) {
                g_overlay->Shutdown();
                g_overlay.reset();
            }
            
            // Shutdown GDI+
            if (g_gdiplusToken) {
                GdiplusShutdown(g_gdiplusToken);
            }
            
            OutputDebugStringA("[CoachClippi] Cleanup complete\n");
            break;
        }
    }
    
    return TRUE;
}

// OverlayRenderer implementation
void OverlayRenderer::Initialize() {
    m_enabled = true;
    LoadConfiguration();
    OutputDebugStringA("[CoachClippi] OverlayRenderer initialized\n");
}

void OverlayRenderer::Shutdown() {
    m_enabled = false;
    SaveConfiguration();
    OutputDebugStringA("[CoachClippi] OverlayRenderer shutdown\n");
}

void OverlayRenderer::LoadConfiguration() {
    // Load configuration from file or use defaults
    m_config.transparency = 0.8f;
    m_config.theme = OverlayTheme::DARK;
    m_config.displayDuration = 5000;
    m_config.fontSize = 14;
    m_config.position = OverlayPosition::TOP_RIGHT;
    
    // Try to load from file
    CHAR path[MAX_PATH];
    if (GetModuleFileNameA(NULL, path, MAX_PATH)) {
        std::string configPath = path;
        size_t pos = configPath.find_last_of("\\/");
        if (pos != std::string::npos) {
            configPath = configPath.substr(0, pos + 1) + "overlay_config.ini";
            
            // Read config file (simplified)
            m_config.transparency = GetPrivateProfileIntA("Overlay", "Transparency", 80, configPath.c_str()) / 100.0f;
            m_config.displayDuration = GetPrivateProfileIntA("Overlay", "Duration", 5000, configPath.c_str());
            m_config.fontSize = GetPrivateProfileIntA("Overlay", "FontSize", 14, configPath.c_str());
        }
    }
}

void OverlayRenderer::SaveConfiguration() {
    CHAR path[MAX_PATH];
    if (GetModuleFileNameA(NULL, path, MAX_PATH)) {
        std::string configPath = path;
        size_t pos = configPath.find_last_of("\\/");
        if (pos != std::string::npos) {
            configPath = configPath.substr(0, pos + 1) + "overlay_config.ini";
            
            // Write config file
            WritePrivateProfileStringA("Overlay", "Transparency", 
                std::to_string((int)(m_config.transparency * 100)).c_str(), configPath.c_str());
            WritePrivateProfileStringA("Overlay", "Duration", 
                std::to_string(m_config.displayDuration).c_str(), configPath.c_str());
            WritePrivateProfileStringA("Overlay", "FontSize", 
                std::to_string(m_config.fontSize).c_str(), configPath.c_str());
        }
    }
}

void OverlayRenderer::ProcessMessage(const std::string& message) {
    OverlayMessage msg;
    msg.text = message;
    msg.duration = m_config.displayDuration;
    msg.position = MessagePosition::AUTO;
    msg.category = MessageCategory::GENERAL;
    msg.priority = MessagePriority::NORMAL;
    
    std::lock_guard<std::mutex> lock(g_messageMutex);
    g_messageQueue.push(msg);
    
    OutputDebugStringA("[CoachClippi] Message queued for display: ");
    OutputDebugStringA(message.c_str());
    OutputDebugStringA("\n");
}

bool OverlayRenderer::IsEnabled() const {
    return m_enabled;
}

void OverlayRenderer::SetEnabled(bool enabled) {
    m_enabled = enabled;
    OutputDebugStringA(enabled ? "[CoachClippi] Overlay enabled\n" : "[CoachClippi] Overlay disabled\n");
}

void OverlayRenderer::SetTransparency(float transparency) {
    m_config.transparency = transparency;
}

void OverlayRenderer::SetTheme(OverlayTheme theme) {
    m_config.theme = theme;
}

void OverlayRenderer::SetDisplayDuration(int milliseconds) {
    m_config.displayDuration = milliseconds;
}

// Export functions for testing
extern "C" {
    __declspec(dllexport) void TestOverlay() {
        if (g_overlay) {
            g_overlay->ProcessMessage("Test message from Coach Clippi!");
        }
    }
    
    __declspec(dllexport) bool IsOverlayReady() {
        return g_overlay && g_overlay->IsEnabled();
    }
}
