// Overlay DLL Header - Direct window injection for Slippi Dolphin
#pragma once

#include <windows.h>
#include <d3d11.h>
#include <d3d12.h>
#include <dxgi.h>
#include <gl/GL.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <thread>
#include <atomic>

// Forward declarations
struct CoachingBubble;
struct OverlayConfig;
class TextRenderer;
class BubbleRenderer;

/**
 * Main overlay class that handles DirectX/OpenGL hooking and rendering
 */
class GameOverlay {
public:
    GameOverlay();
    ~GameOverlay();

    // Initialization
    bool Initialize();
    void Shutdown();

    // Hook management
    bool InstallHooks();
    void RemoveHooks();

    // Configuration
    void UpdateConfig(const std::string& configJson);
    void SetEnabled(bool enabled);
    void SetTransparency(float transparency);
    void SetTheme(const std::string& themeName);

    // Coaching display
    void DisplayCoachingAdvice(const std::string& text, const std::string& category = "general");
    void ClearAdvice();
    void ClearAllAdvice();

    // Status
    bool IsInitialized() const { return m_initialized; }
    bool IsEnabled() const { return m_enabled; }

private:
    // DirectX 11 hooks
    static HRESULT WINAPI D3D11PresentHook(IDXGISwapChain* pSwapChain, UINT SyncInterval, UINT Flags);
    static HRESULT WINAPI D3D11ResizeBuffersHook(IDXGISwapChain* pSwapChain, UINT BufferCount, UINT Width, UINT Height, DXGI_FORMAT NewFormat, UINT SwapChainFlags);

    // DirectX 12 hooks
    static HRESULT WINAPI D3D12PresentHook(IDXGISwapChain* pSwapChain, UINT SyncInterval, UINT Flags);

    // OpenGL hooks
    static BOOL WINAPI wglSwapBuffersHook(HDC hdc);

    // Window procedure hook
    static LRESULT WINAPI WndProcHook(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

    // Rendering
    void RenderOverlay();
    void RenderD3D11();
    void RenderD3D12();
    void RenderOpenGL();

    // Initialization helpers
    bool InitializeD3D11();
    bool InitializeD3D12();
    bool InitializeOpenGL();

    // Bubble management
    void AddBubble(const CoachingBubble& bubble);
    void UpdateBubbles(float deltaTime);
    void RemoveExpiredBubbles();

    // Input handling
    void ProcessInput();
    bool IsHotkeyPressed();

    // Utility
    void GetScreenDimensions(int& width, int& height);
    void CalculateBubblePosition(const std::string& position, int& x, int& y);

private:
    // State
    std::atomic<bool> m_initialized;
    std::atomic<bool> m_enabled;
    std::atomic<bool> m_hotkeyPressed;
    
    // Graphics API detection
    enum class GraphicsAPI {
        Unknown,
        DirectX11,
        DirectX12,
        OpenGL
    };
    GraphicsAPI m_graphicsAPI;

    // DirectX 11
    ID3D11Device* m_d3d11Device;
    ID3D11DeviceContext* m_d3d11Context;
    IDXGISwapChain* m_d3d11SwapChain;

    // DirectX 12
    ID3D12Device* m_d3d12Device;
    ID3D12CommandQueue* m_d3d12CommandQueue;
    IDXGISwapChain3* m_d3d12SwapChain;

    // OpenGL
    HDC m_glHDC;
    HGLRC m_glContext;

    // Window
    HWND m_targetWindow;
    WNDPROC m_originalWndProc;

    // Rendering components
    std::unique_ptr<TextRenderer> m_textRenderer;
    std::unique_ptr<BubbleRenderer> m_bubbleRenderer;

    // Configuration
    std::unique_ptr<OverlayConfig> m_config;

    // Coaching bubbles
    std::vector<std::unique_ptr<CoachingBubble>> m_bubbles;
    std::mutex m_bubblesMutex;

    // Timing
    LARGE_INTEGER m_frequency;
    LARGE_INTEGER m_lastTime;

    // Hook addresses
    void* m_d3d11PresentOriginal;
    void* m_d3d11ResizeBuffersOriginal;
    void* m_d3d12PresentOriginal;
    void* m_wglSwapBuffersOriginal;

    // Thread safety
    std::mutex m_renderMutex;
    std::mutex m_configMutex;
};

/**
 * Coaching bubble structure
 */
struct CoachingBubble {
    std::string text;
    std::string category;
    float x, y;
    float width, height;
    float alpha;
    float lifetime;
    float maxLifetime;
    bool fadeOut;
    
    // Animation
    float animationTime;
    float targetX, targetY;
    
    CoachingBubble(const std::string& text, const std::string& category = "general");
    void Update(float deltaTime);
    bool IsExpired() const;
};

/**
 * Overlay configuration structure
 */
struct OverlayConfig {
    // Display settings
    bool enabled;
    float transparency;
    std::string theme;
    std::string hotkey;
    
    // Bubble settings
    std::string bubbleStyle;
    int fontSize;
    std::string fontFamily;
    int maxBubbles;
    float displayDuration;
    bool fadeAnimation;
    
    // Theme colors
    struct Theme {
        std::string name;
        DWORD backgroundColor;
        DWORD textColor;
        DWORD borderColor;
        int borderWidth;
        int borderRadius;
        DWORD shadowColor;
        int shadowOffsetX, shadowOffsetY;
        int shadowBlur;
    } currentTheme;
    
    // Performance
    int maxFPS;
    bool vsync;
    bool lowLatencyMode;
    
    OverlayConfig();
    void LoadFromJson(const std::string& json);
    DWORD ParseColor(const std::string& colorStr);
};

/**
 * Text rendering class
 */
class TextRenderer {
public:
    TextRenderer();
    ~TextRenderer();

    bool Initialize(ID3D11Device* device = nullptr);
    void Shutdown();

    void RenderText(const std::string& text, float x, float y, DWORD color, int fontSize = 14);
    void SetFont(const std::string& fontFamily, int fontSize);
    
    // Text measurement
    void MeasureText(const std::string& text, int fontSize, int& width, int& height);

private:
    bool m_initialized;
    HDC m_memoryDC;
    HBITMAP m_bitmap;
    HFONT m_font;
    void* m_fontData;
    
    // DirectX resources for text rendering
    ID3D11Device* m_device;
    ID3D11Texture2D* m_textTexture;
    ID3D11ShaderResourceView* m_textSRV;
};

/**
 * Bubble rendering class
 */
class BubbleRenderer {
public:
    BubbleRenderer();
    ~BubbleRenderer();

    bool Initialize(ID3D11Device* device = nullptr);
    void Shutdown();

    void RenderBubble(const CoachingBubble& bubble, const OverlayConfig::Theme& theme);
    void RenderSpeechBubble(float x, float y, float width, float height, const OverlayConfig::Theme& theme);
    void RenderThoughtBubble(float x, float y, float width, float height, const OverlayConfig::Theme& theme);

private:
    bool m_initialized;
    ID3D11Device* m_device;
    
    // Rendering resources
    ID3D11Buffer* m_vertexBuffer;
    ID3D11Buffer* m_indexBuffer;
    ID3D11VertexShader* m_vertexShader;
    ID3D11PixelShader* m_pixelShader;
    ID3D11InputLayout* m_inputLayout;
    ID3D11BlendState* m_blendState;
    ID3D11RasterizerState* m_rasterizerState;
    
    void CreateRenderingResources();
    void DrawRoundedRect(float x, float y, float width, float height, float radius, DWORD color);
    void DrawTriangle(float x1, float y1, float x2, float y2, float x3, float y3, DWORD color);
};

// Global overlay instance
extern std::unique_ptr<GameOverlay> g_overlay;

// DLL exports
extern "C" {
    __declspec(dllexport) bool InitializeOverlay();
    __declspec(dllexport) void ShutdownOverlay();
    __declspec(dllexport) void UpdateOverlayConfig(const char* configJson);
    __declspec(dllexport) void DisplayCoaching(const char* text, const char* category);
    __declspec(dllexport) void ClearCoaching();
    __declspec(dllexport) bool IsOverlayActive();
}

// Utility macros
#define SAFE_RELEASE(p) { if(p) { (p)->Release(); (p) = nullptr; } }
#define SAFE_DELETE(p) { delete (p); (p) = nullptr; }

// Constants
constexpr int MAX_BUBBLES = 10;
constexpr float DEFAULT_BUBBLE_LIFETIME = 5.0f;
constexpr float ANIMATION_SPEED = 2.0f;
constexpr int BUBBLE_PADDING = 10;
constexpr int BUBBLE_MARGIN = 20;
