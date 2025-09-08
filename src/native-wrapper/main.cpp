#include <windows.h>
#include <objbase.h>
#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
#include "WindowManager.h"
#include "GameDataInterface.h"
#include "CoachingInterface.h"
#include "imgui.h"
#include "imgui_internal.h"
#include "imgui_impl_win32.h"
#include "imgui_impl_dx11.h"
#include <d3d11.h>

// Application constants
const wchar_t* APP_CLASS_NAME = L"CoachClippiWrapper";
const wchar_t* APP_WINDOW_NAME = L"Coach Clippi - Slippi Integration";
const int DEFAULT_WIDTH = 1400;
const int DEFAULT_HEIGHT = 900;
const int GAME_AREA_WIDTH = 960;
const int GAME_AREA_HEIGHT = 720;

// Global application state
struct AppState {
    HWND mainWindow;
    HWND gameWindow;
    WindowManager* windowManager;
    GameDataInterface* gameInterface;
    CoachingInterface* coachingUI;
    bool isGameEmbedded;
    bool isRunning;
};

AppState g_appState = {};

// Data
static ID3D11Device*            g_pd3dDevice = nullptr;
static ID3D11DeviceContext*     g_pd3dDeviceContext = nullptr;
static IDXGISwapChain*          g_pSwapChain = nullptr;
static ID3D11RenderTargetView*  g_mainRenderTargetView = nullptr;

// Forward declarations
LRESULT CALLBACK MainWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void InitializeApplication();
void GameDetectionThread();
void UpdateLayout();
void CleanupApplication();
bool CreateDeviceD3D(HWND hWnd);
void CleanupDeviceD3D();
void CreateRenderTarget();
void CleanupRenderTarget();
void RenderUI();

extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam);

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // Initialize COM for window management
    CoInitialize(nullptr);
    
    // Register window class
    WNDCLASSEX wc = {};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = MainWindowProc;
    wc.hInstance = hInstance;
    wc.hIcon = LoadIcon(nullptr, IDI_APPLICATION);
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.lpszClassName = APP_CLASS_NAME;
    wc.hIconSm = LoadIcon(nullptr, IDI_APPLICATION);
    
    if (!RegisterClassEx(&wc)) {
        MessageBox(nullptr, L"Failed to register window class", L"Error", MB_OK | MB_ICONERROR);
        return 1;
    }
    
    // Create menu bar
    HMENU hMenuBar = CreateMenu();
    HMENU hFileMenu = CreatePopupMenu();
    HMENU hViewMenu = CreatePopupMenu();
    HMENU hToolsMenu = CreatePopupMenu();
    HMENU hHelpMenu = CreatePopupMenu();
    
    // File menu
    AppendMenu(hFileMenu, MF_STRING, 2001, L"New Session");
    AppendMenu(hFileMenu, MF_STRING, 2002, L"Save Stats");
    AppendMenu(hFileMenu, MF_STRING, 2003, L"Export Data");
    AppendMenu(hFileMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenu(hFileMenu, MF_STRING, 2004, L"Exit");
    
    // View menu
    AppendMenu(hViewMenu, MF_STRING, 2101, L"Player Stats Panel");
    AppendMenu(hViewMenu, MF_STRING, 2102, L"Commentary Panel");
    AppendMenu(hViewMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenu(hViewMenu, MF_STRING, 2103, L"Dark Theme");
    AppendMenu(hViewMenu, MF_STRING, 2104, L"Light Theme");
    
    // Tools menu
    AppendMenu(hToolsMenu, MF_STRING, 2201, L"Settings");
    AppendMenu(hToolsMenu, MF_STRING, 2202, L"Reset Stats");
    AppendMenu(hToolsMenu, MF_STRING, 2203, L"Calibration");
    
    // Help menu
    AppendMenu(hHelpMenu, MF_STRING, 2301, L"About Coach Clippi");
    AppendMenu(hHelpMenu, MF_STRING, 2302, L"Keyboard Shortcuts");
    
    // Add menus to menu bar
    AppendMenu(hMenuBar, MF_POPUP, (UINT_PTR)hFileMenu, L"File");
    AppendMenu(hMenuBar, MF_POPUP, (UINT_PTR)hViewMenu, L"View");
    AppendMenu(hMenuBar, MF_POPUP, (UINT_PTR)hToolsMenu, L"Tools");
    AppendMenu(hMenuBar, MF_POPUP, (UINT_PTR)hHelpMenu, L"Help");
    
    // Create main window with menu
    g_appState.mainWindow = CreateWindowEx(
        WS_EX_APPWINDOW,
        APP_CLASS_NAME,
        APP_WINDOW_NAME,
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT,
        DEFAULT_WIDTH, DEFAULT_HEIGHT,
        nullptr, hMenuBar, hInstance, nullptr
    );
    
    if (!g_appState.mainWindow) {
        MessageBox(nullptr, L"Failed to create main window", L"Error", MB_OK | MB_ICONERROR);
        return 1;
    }
    
    // Initialize Direct3D
    if (!CreateDeviceD3D(g_appState.mainWindow))
    {
        CleanupDeviceD3D();
        return 1;
    }
    
    // Initialize application components
    InitializeApplication();
    
    // Show window
    ShowWindow(g_appState.mainWindow, nCmdShow);
    UpdateWindow(g_appState.mainWindow);
    
    // Setup Dear ImGui context
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO(); (void)io;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableGamepad;      // Enable Gamepad Controls
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;         // Enable Docking
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;       // Enable Multi-Viewport / Platform Windows
    io.ConfigDockingWithShift = false;                        // Enable docking without holding Shift
    
    // Setup Dear ImGui style with modern dark theme
    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    
    // Enhance style for better visual appearance
    style.WindowRounding = 4.0f;
    style.FrameRounding = 4.0f;
    style.GrabRounding = 3.0f;
    style.ScrollbarRounding = 3.0f;
    style.FramePadding = ImVec2(8, 4);
    style.ItemSpacing = ImVec2(8, 4);
    style.WindowPadding = ImVec2(8, 8);
    
    // Set colors for a more modern look
    ImVec4* colors = style.Colors;
    colors[ImGuiCol_WindowBg] = ImVec4(0.10f, 0.10f, 0.12f, 1.00f);
    colors[ImGuiCol_TitleBg] = ImVec4(0.08f, 0.08f, 0.10f, 1.00f);
    colors[ImGuiCol_TitleBgActive] = ImVec4(0.00f, 0.48f, 1.00f, 1.00f);
    colors[ImGuiCol_FrameBg] = ImVec4(0.15f, 0.15f, 0.17f, 1.00f);
    colors[ImGuiCol_Border] = ImVec4(0.23f, 0.23f, 0.24f, 1.00f);
    colors[ImGuiCol_Header] = ImVec4(0.00f, 0.48f, 1.00f, 0.31f);
    colors[ImGuiCol_HeaderHovered] = ImVec4(0.00f, 0.48f, 1.00f, 0.40f);
    colors[ImGuiCol_HeaderActive] = ImVec4(0.00f, 0.48f, 1.00f, 0.50f);
    colors[ImGuiCol_Button] = ImVec4(0.15f, 0.15f, 0.17f, 1.00f);
    colors[ImGuiCol_ButtonHovered] = ImVec4(0.00f, 0.48f, 1.00f, 0.40f);
    colors[ImGuiCol_ButtonActive] = ImVec4(0.00f, 0.48f, 1.00f, 0.50f);
    
    // Setup Platform/Renderer backends
    if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable)
    {
        style.WindowRounding = 0.0f;
        style.Colors[ImGuiCol_WindowBg].w = 1.0f;
    }

    // Setup Platform/Renderer backends
    ImGui_ImplWin32_Init(g_appState.mainWindow);
    ImGui_ImplDX11_Init(g_pd3dDevice, g_pd3dDeviceContext);
    
    // Start game detection thread
    std::thread gameDetection(GameDetectionThread);
    gameDetection.detach();
    
    // Main message loop
    MSG msg = {};
    g_appState.isRunning = true;
    
    while (g_appState.isRunning)
    {
        // Poll and handle messages (inputs, window resize, etc.)
        // You can read the io.WantCaptureMouse, io.WantCaptureKeyboard flags to tell if dear imgui wants to use your inputs.
        // - When io.WantCaptureMouse is true, do not dispatch mouse input data to your main application.
        // - When io.WantCaptureKeyboard is true, do not dispatch keyboard input data to your main application.
        // Generally you may always pass all inputs to dear imgui, and hide them from your application based on those two flags.
        if (PeekMessage(&msg, nullptr, 0U, 0U, PM_REMOVE))
        {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
            if (msg.message == WM_QUIT)
                g_appState.isRunning = false;
        }
        if (!g_appState.isRunning)
            break;

        // Start the Dear ImGui frame
        ImGui_ImplDX11_NewFrame();
        ImGui_ImplWin32_NewFrame();
        ImGui::NewFrame();

        RenderUI();

        // Rendering
        ImGui::Render();
        const float clear_color_with_alpha[4] = { 0.45f, 0.55f, 0.60f, 1.00f };
        g_pd3dDeviceContext->OMSetRenderTargets(1, &g_mainRenderTargetView, nullptr);
        g_pd3dDeviceContext->ClearRenderTargetView(g_mainRenderTargetView, clear_color_with_alpha);
        ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());

        // Update and Render additional Platform Windows
        if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable)
        {
            ImGui::UpdatePlatformWindows();
            ImGui::RenderPlatformWindowsDefault();
        }

        g_pSwapChain->Present(1, 0); // Present with vsync
    }
    
    // Cleanup
    CleanupApplication();
    CoUninitialize();
    
    return (int)msg.wParam;
}

void RenderUI()
{
    // Create a fullscreen dockspace
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->Pos);
    ImGui::SetNextWindowSize(viewport->Size);
    ImGui::SetNextWindowViewport(viewport->ID);
    
    ImGuiWindowFlags window_flags = ImGuiWindowFlags_MenuBar | ImGuiWindowFlags_NoDocking;
    window_flags |= ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove;
    window_flags |= ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoNavFocus;
    
    // Configure dockspace flags
    ImGuiDockNodeFlags dockspace_flags = ImGuiDockNodeFlags_None;
    dockspace_flags |= ImGuiDockNodeFlags_PassthruCentralNode; // Allow windows to be docked in the central area
    
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    
    ImGui::Begin("Coach Clippi DockSpace", nullptr, window_flags);
    ImGui::PopStyleVar(3);
    
    // Create the dockspace
    ImGuiID dockspace_id = ImGui::GetID("CoachClippiDockSpace");
    ImGui::DockSpace(dockspace_id, ImVec2(0.0f, 0.0f), dockspace_flags);
    
    // Create menu bar for docking controls
    if (ImGui::BeginMenuBar())
    {
        if (ImGui::BeginMenu("Layout"))
        {
            if (ImGui::MenuItem("Reset Layout")) {
                // Reset to default layout
                ImGui::DockBuilderRemoveNode(dockspace_id);
                ImGui::DockBuilderAddNode(dockspace_id, dockspace_flags | ImGuiDockNodeFlags_DockSpace);
                ImGui::DockBuilderSetNodeSize(dockspace_id, viewport->Size);
                
                // Split the dockspace into regions
                auto dock_id_left = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Left, 0.20f, nullptr, &dockspace_id);
                auto dock_id_right = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Right, 0.25f, nullptr, &dockspace_id);
                auto dock_id_bottom = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Down, 0.25f, nullptr, &dockspace_id);
                
                // Dock windows to specific areas
                ImGui::DockBuilderDockWindow("Player Stats", dock_id_left);
                ImGui::DockBuilderDockWindow("Commentary", dock_id_right);
                ImGui::DockBuilderDockWindow("Tips & Coaching", dock_id_bottom);
                ImGui::DockBuilderDockWindow("Game Window", dockspace_id);
                
                ImGui::DockBuilderFinish(dockspace_id);
            }
            
            if (ImGui::MenuItem("Coaching Layout")) {
                // Preset layout optimized for coaching
                ImGui::DockBuilderRemoveNode(dockspace_id);
                ImGui::DockBuilderAddNode(dockspace_id, dockspace_flags | ImGuiDockNodeFlags_DockSpace);
                ImGui::DockBuilderSetNodeSize(dockspace_id, viewport->Size);
                
                auto dock_id_left = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Left, 0.25f, nullptr, &dockspace_id);
                auto dock_id_right = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Right, 0.30f, nullptr, &dockspace_id);
                
                ImGui::DockBuilderDockWindow("Player Stats", dock_id_left);
                ImGui::DockBuilderDockWindow("Commentary", dock_id_right);
                ImGui::DockBuilderDockWindow("Tips & Coaching", dock_id_right);
                ImGui::DockBuilderDockWindow("Game Window", dockspace_id);
                
                ImGui::DockBuilderFinish(dockspace_id);
            }
            
            if (ImGui::MenuItem("Analysis Layout")) {
                // Preset layout optimized for analysis
                ImGui::DockBuilderRemoveNode(dockspace_id);
                ImGui::DockBuilderAddNode(dockspace_id, dockspace_flags | ImGuiDockNodeFlags_DockSpace);
                ImGui::DockBuilderSetNodeSize(dockspace_id, viewport->Size);
                
                auto dock_id_bottom = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Down, 0.35f, nullptr, &dockspace_id);
                auto dock_id_right = ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Right, 0.25f, nullptr, &dockspace_id);
                
                ImGui::DockBuilderDockWindow("Player Stats", dock_id_right);
                ImGui::DockBuilderDockWindow("Commentary", dock_id_bottom);
                ImGui::DockBuilderDockWindow("Tips & Coaching", dock_id_bottom);
                ImGui::DockBuilderDockWindow("Game Window", dockspace_id);
                
                ImGui::DockBuilderFinish(dockspace_id);
            }
            
            ImGui::Separator();
            
            if (ImGui::MenuItem("Save Layout")) {
                // TODO: Implement layout saving
                // This would save the current docking configuration to a file
            }
            
            if (ImGui::MenuItem("Load Layout")) {
                // TODO: Implement layout loading
                // This would load a saved docking configuration from a file
            }
            
            ImGui::EndMenu();
        }
        
        if (ImGui::BeginMenu("Windows"))
        {
            if (ImGui::MenuItem("Player Stats", "F1")) {
                // Toggle stats window visibility
            }
            if (ImGui::MenuItem("Commentary", "F2")) {
                // Toggle commentary window visibility
            }
            if (ImGui::MenuItem("Tips & Coaching", "F3")) {
                // Toggle tips window visibility
            }
            if (ImGui::MenuItem("Game Window", "F4")) {
                // Toggle game window visibility
            }
            
            ImGui::EndMenu();
        }
        
        ImGui::EndMenuBar();
    }
    
    ImGui::End();
    
    // Render the coaching interface panels as dockable windows
    if (g_appState.coachingUI) {
        g_appState.coachingUI->Render();
    }
}

LRESULT CALLBACK MainWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    if (ImGui_ImplWin32_WndProcHandler(hwnd, uMsg, wParam, lParam))
        return true;
        
    switch (uMsg) {
        case WM_CREATE:
            // Window created - components already initialized in WinMain
            break;
            
        case WM_SIZE:
            if (g_pd3dDevice != nullptr && wParam != SIZE_MINIMIZED)
            {
                CleanupRenderTarget();
                g_pSwapChain->ResizeBuffers(0, (UINT)LOWORD(lParam), (UINT)HIWORD(lParam), DXGI_FORMAT_UNKNOWN, 0);
                CreateRenderTarget();
            }
            return 0;
            
        case WM_PAINT: {
            // Let ImGui handle all rendering - just validate the paint message
            PAINTSTRUCT ps;
            BeginPaint(hwnd, &ps);
            EndPaint(hwnd, &ps);
            break;
        }
        
        case WM_COMMAND: {
            WORD commandId = LOWORD(wParam);
            
            // Handle menu commands
            switch (commandId) {
                // File menu
                case 2001: // New Session
                    if (g_appState.coachingUI) {
                        // Reset stats and commentary
                        StatsData emptyStats = {};
                        g_appState.coachingUI->UpdateStats(emptyStats);
                    }
                    break;
                case 2002: // Save Stats
                    MessageBox(hwnd, L"Save Stats functionality would be implemented here", L"Save Stats", MB_OK | MB_ICONINFORMATION);
                    break;
                case 2003: // Export Data
                    MessageBox(hwnd, L"Export Data functionality would be implemented here", L"Export Data", MB_OK | MB_ICONINFORMATION);
                    break;
                case 2004: // Exit
                    PostMessage(hwnd, WM_CLOSE, 0, 0);
                    break;
                    
                // View menu
                case 2101: // Toggle Player Stats Panel
                    if (g_appState.coachingUI) {
                        bool isVisible = g_appState.coachingUI->IsPanelVisible(PanelType::STATS);
                        g_appState.coachingUI->ShowPanel(PanelType::STATS, !isVisible);
                    }
                    break;
                case 2102: // Toggle Commentary Panel
                    if (g_appState.coachingUI) {
                        bool isVisible = g_appState.coachingUI->IsPanelVisible(PanelType::COMMENTARY);
                        g_appState.coachingUI->ShowPanel(PanelType::COMMENTARY, !isVisible);
                    }
                    break;
                case 2103: // Dark Theme
                    MessageBox(hwnd, L"Dark theme is already active", L"Theme", MB_OK | MB_ICONINFORMATION);
                    break;
                case 2104: // Light Theme
                    MessageBox(hwnd, L"Light theme functionality would be implemented here", L"Theme", MB_OK | MB_ICONINFORMATION);
                    break;
                    
                // Tools menu
                case 2201: // Settings
                    MessageBox(hwnd, L"Settings dialog would be implemented here", L"Settings", MB_OK | MB_ICONINFORMATION);
                    break;
                case 2202: // Reset Stats
                    if (g_appState.coachingUI) {
                        StatsData emptyStats = {};
                        g_appState.coachingUI->UpdateStats(emptyStats);
                        MessageBox(hwnd, L"Stats have been reset", L"Reset Stats", MB_OK | MB_ICONINFORMATION);
                    }
                    break;
                case 2203: // Calibration
                    MessageBox(hwnd, L"Calibration functionality would be implemented here", L"Calibration", MB_OK | MB_ICONINFORMATION);
                    break;
                    
                // Help menu
                case 2301: // About
                    MessageBox(hwnd, L"Coach Clippi - Slippi Integration\nVersion 1.0\n\nA professional coaching interface for Super Smash Bros. Melee", L"About Coach Clippi", MB_OK | MB_ICONINFORMATION);
                    break;
                case 2302: // Keyboard Shortcuts
                    MessageBox(hwnd, L"Keyboard shortcuts:\nF1 - Toggle Stats Panel\nF2 - Toggle Commentary Panel\nF5 - Reset Stats", L"Keyboard Shortcuts", MB_OK | MB_ICONINFORMATION);
                    break;
                    
                default:
                    // Pass to coaching interface for any other commands
                    if (g_appState.coachingUI) {
                        g_appState.coachingUI->HandleCommand(commandId);
                    }
                    break;
            }
            break;
        }
            
        case WM_CLOSE:
            g_appState.isRunning = false;
            DestroyWindow(hwnd);
            break;
            
        case WM_DESTROY:
            PostQuitMessage(0);
            break;
            
        default:
            return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
    
    return 0;
}

void InitializeApplication() {
    // Initialize window manager
    g_appState.windowManager = new WindowManager();
    
    // Initialize game data interface
    g_appState.gameInterface = new GameDataInterface();
    
    // Initialize coaching interface
    g_appState.coachingUI = new CoachingInterface(g_appState.mainWindow);
    
    // Set initial state
    g_appState.isGameEmbedded = false;
    
    std::wcout << L"Coach Clippi initialized successfully" << std::endl;
}

void GameDetectionThread() {
    std::wcout << L"Starting game detection thread..." << std::endl;
    
    // Give the main UI thread time to initialize ImGui
    std::this_thread::sleep_for(std::chrono::seconds(2));
    
    while (g_appState.isRunning) {
        if (!g_appState.isGameEmbedded) {
            // Look for Dolphin/Slippi windows
            HWND gameWindow = g_appState.windowManager->FindGameWindow();
            
            if (gameWindow) {
                std::wcout << L"Found game window, attempting to embed..." << std::endl;
                
                // Get the ImGui game window container from CoachingInterface
                HWND containerWindow = g_appState.coachingUI->GetGameWindowContainer();
                
                // If container window is not yet created, wait for next iteration
                if (containerWindow == nullptr) {
                    std::wcout << L"Waiting for ImGui game container window to be created..." << std::endl;
                    std::this_thread::sleep_for(std::chrono::milliseconds(500));
                    continue;
                }
                
                // Validate that the container window is actually ready
                if (!IsWindow(containerWindow)) {
                    std::wcout << L"Container window handle is invalid, waiting..." << std::endl;
                    std::this_thread::sleep_for(std::chrono::milliseconds(500));
                    continue;
                }
                
                // Additional validation - ensure container has a valid client area
                RECT containerRect;
                if (!GetClientRect(containerWindow, &containerRect) || 
                    containerRect.right <= 0 || containerRect.bottom <= 0) {
                    std::wcout << L"Container window not ready (no client area), waiting..." << std::endl;
                    std::this_thread::sleep_for(std::chrono::milliseconds(500));
                    continue;
                }
                
                std::wcout << L"Container window ready: " << (void*)containerWindow 
                          << L" (size: " << containerRect.right << L"x" << containerRect.bottom << L")" << std::endl;
                
                // Embed the game window into the ImGui container window
                if (g_appState.windowManager->EmbedGameWindow(containerWindow, gameWindow)) {
                    g_appState.gameWindow = gameWindow;
                    g_appState.isGameEmbedded = true;
                    
                    // Get the actual content area coordinates from the CoachingInterface
                    RECT contentArea = g_appState.coachingUI->GetGameWindowContentArea();
                    
                    if (contentArea.right > contentArea.left && contentArea.bottom > contentArea.top) {
                        int contentWidth = contentArea.right - contentArea.left;
                        int contentHeight = contentArea.bottom - contentArea.top;
                        
                        std::wcout << L"Positioning game window to ImGui content area:" << std::endl;
                        std::wcout << L"  Position: (" << contentArea.left << L"," << contentArea.top << L")" << std::endl;
                        std::wcout << L"  Size: " << contentWidth << L"x" << contentHeight << std::endl;
                        
                        // Position and size the game window to exactly match the ImGui panel's content area
                        SetWindowPos(g_appState.gameWindow, HWND_BOTTOM,
                                    contentArea.left, contentArea.top, 
                                    contentWidth, contentHeight,
                                    SWP_NOACTIVATE | SWP_NOOWNERZORDER);
                        
                        // Use synchronized refresh
                        g_appState.windowManager->SynchronizeWindowRefresh(containerWindow, g_appState.gameWindow);
                    } else {
                        std::wcout << L"Warning: Invalid content area, using fallback sizing" << std::endl;
                        
                        // Fallback to container client area
                        RECT containerClientRect;
                        if (GetClientRect(containerWindow, &containerClientRect)) {
                            int contentWidth = containerClientRect.right - containerClientRect.left;
                            int contentHeight = containerClientRect.bottom - containerClientRect.top;
                            
                            SetWindowPos(g_appState.gameWindow, HWND_BOTTOM,
                                        0, 0, contentWidth, contentHeight,
                                        SWP_NOACTIVATE | SWP_NOOWNERZORDER);
                        }
                    }
                    
                    // Start game data interface
                    g_appState.gameInterface->StartMonitoring();
                    
                    // Update layout
                    UpdateLayout();
                    
                    std::wcout << L"Game window embedded successfully into ImGui container!" << std::endl;
                    
                    // Add a commentary message about successful embedding
                    g_appState.coachingUI->AddCommentaryWithType(
                        "Game window embedded successfully! Ready for coaching.", 
                        "system", 
                        true
                    );
                } else {
                    std::wcout << L"Failed to embed game window, will retry..." << std::endl;
                }
            }
        } else {
            // Check if game window is still valid
            if (!IsWindow(g_appState.gameWindow)) {
                std::wcout << L"Game window lost, resetting..." << std::endl;
                g_appState.isGameEmbedded = false;
                g_appState.gameWindow = nullptr;
                g_appState.gameInterface->StopMonitoring();
                
                // Add commentary about lost connection
                g_appState.coachingUI->AddCommentaryWithType(
                    "Game window connection lost. Searching for new game window...", 
                    "system", 
                    false
                );
            }
            
            // Check if container window is still valid
            HWND containerWindow = g_appState.coachingUI->GetGameWindowContainer();
            if (g_appState.isGameEmbedded && (!containerWindow || !IsWindow(containerWindow))) {
                std::wcout << L"ImGui container window lost, resetting..." << std::endl;
                
                // Restore the game window before resetting
                if (g_appState.gameWindow && IsWindow(g_appState.gameWindow)) {
                    g_appState.windowManager->RestoreGameWindow(g_appState.gameWindow);
                }
                
                g_appState.isGameEmbedded = false;
                g_appState.gameWindow = nullptr;
                g_appState.gameInterface->StopMonitoring();
                
                // Add commentary about container loss
                g_appState.coachingUI->AddCommentaryWithType(
                    "Container window lost. Game window restored to original state.", 
                    "system", 
                    false
                );
            }
            
            // If embedded, periodically update the game window position and size using content area
            if (g_appState.isGameEmbedded && containerWindow && IsWindow(containerWindow)) {
                // Get the current content area from the CoachingInterface
                RECT contentArea = g_appState.coachingUI->GetGameWindowContentArea();
                
                if (contentArea.right > contentArea.left && contentArea.bottom > contentArea.top) {
                    int contentWidth = contentArea.right - contentArea.left;
                    int contentHeight = contentArea.bottom - contentArea.top;
                    
                    // Only update if content area has reasonable dimensions
                    if (contentWidth > 100 && contentHeight > 100) {
                        // Position and size the game window to match the ImGui panel's content area
                        if (SetWindowPos(g_appState.gameWindow, HWND_BOTTOM,
                                        contentArea.left, contentArea.top,
                                        contentWidth, contentHeight,
                                        SWP_NOACTIVATE | SWP_NOOWNERZORDER)) {
                            
                            // Use the synchronized refresh method less frequently to reduce flashing
                            static DWORD lastRefresh = 0;
                            DWORD currentTime = GetTickCount();
                            if (currentTime - lastRefresh > 2000) {  // Only refresh every 2 seconds
                                g_appState.windowManager->SynchronizeWindowRefresh(containerWindow, g_appState.gameWindow);
                                lastRefresh = currentTime;
                            }
                        }
                    }
                }
            }
        }
        
        // Check more frequently for better responsiveness
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    }
    
    std::wcout << L"Game detection thread ended" << std::endl;
}

void UpdateLayout() {
    RECT clientRect;
    GetClientRect(g_appState.mainWindow, &clientRect);
    
    int clientWidth = clientRect.right - clientRect.left;
    int clientHeight = clientRect.bottom - clientRect.top;
    
    // Define panel sizes as percentages of total window size
    int panelMargin = 15;  // Increased margin for better spacing
    int leftPanelWidth = std::max(220, clientWidth / 6);    // ~16% of window width, min 220px
    int rightPanelWidth = std::max(280, clientWidth / 5);   // ~20% of window width, min 280px
    
    // Ensure panels don't take up too much space
    leftPanelWidth = std::min(leftPanelWidth, 320);
    rightPanelWidth = std::min(rightPanelWidth, 350);
    
    // Calculate available space for the game window
    int availableGameWidth = clientWidth - leftPanelWidth - rightPanelWidth - (panelMargin * 4);
    int availableGameHeight = clientHeight - (panelMargin * 2);
    
    // Calculate optimal game window size to fit the available space
    // Maintain 4:3 aspect ratio (typical for Melee)
    int optimalGameWidth = availableGameWidth;
    int optimalGameHeight = (optimalGameWidth * 3) / 4;  // 4:3 aspect ratio
    
    // If height is too big, scale down maintaining aspect ratio
    if (optimalGameHeight > availableGameHeight) {
        optimalGameHeight = availableGameHeight;
        optimalGameWidth = (optimalGameHeight * 4) / 3;
    }
    
    // Ensure minimum game window size
    optimalGameWidth = std::max(640, optimalGameWidth);
    optimalGameHeight = std::max(480, optimalGameHeight);
    
    // Center the game window in the available space
    int gameX = leftPanelWidth + panelMargin * 2 + (availableGameWidth - optimalGameWidth) / 2;
    int gameY = panelMargin + (availableGameHeight - optimalGameHeight) / 2;
    
    // Create game area rectangle
    RECT gameArea = {gameX, gameY, gameX + optimalGameWidth, gameY + optimalGameHeight};
    
    // Log layout information
    std::wcout << L"Game area: " << optimalGameWidth << L"x" << optimalGameHeight 
              << L" at (" << gameX << L"," << gameY << L")" << std::endl;
    
    // Update coaching interface with the calculated layout
    if (g_appState.coachingUI) {
        g_appState.coachingUI->UpdateLayout(clientRect, gameArea);
    }
    
    // If we have an embedded game window, resize it to match the ImGui container
    if (g_appState.isGameEmbedded && g_appState.gameWindow) {
        // The game window should fill the entire ImGui container window
        // We don't need to position it as it's already embedded in the container
        HWND containerWindow = g_appState.coachingUI->GetGameWindowContainer();
        if (containerWindow) {
            RECT containerRect;
            GetClientRect(containerWindow, &containerRect);
            
            int containerWidth = containerRect.right - containerRect.left;
            int containerHeight = containerRect.bottom - containerRect.top;
            
            // Only resize if we have valid dimensions
            if (containerWidth > 0 && containerHeight > 0) {
                SetWindowPos(g_appState.gameWindow, HWND_BOTTOM, 
                            0, 0, containerWidth, containerHeight,
                            SWP_NOACTIVATE);
                
                std::wcout << L"Resized game window to match container: " 
                          << containerWidth << L"x" << containerHeight << std::endl;
            }
        }
    }
}

void CleanupApplication() {
    std::wcout << L"Cleaning up application..." << std::endl;
    
    ImGui_ImplDX11_Shutdown();
    ImGui_ImplWin32_Shutdown();
    ImGui::DestroyContext();

    CleanupDeviceD3D();
    
    // Stop monitoring
    if (g_appState.gameInterface) {
        g_appState.gameInterface->StopMonitoring();
        delete g_appState.gameInterface;
    }
    
    // Restore game window if embedded
    if (g_appState.isGameEmbedded && g_appState.gameWindow) {
        g_appState.windowManager->RestoreGameWindow(g_appState.gameWindow);
    }
    
    // Cleanup components
    if (g_appState.coachingUI) {
        delete g_appState.coachingUI;
    }
    
    if (g_appState.windowManager) {
        delete g_appState.windowManager;
    }
    
    std::wcout << L"Cleanup complete" << std::endl;
}

// Helper functions

bool CreateDeviceD3D(HWND hWnd)
{
    // Setup swap chain
    DXGI_SWAP_CHAIN_DESC sd;
    ZeroMemory(&sd, sizeof(sd));
    sd.BufferCount = 2;
    sd.BufferDesc.Width = 0;
    sd.BufferDesc.Height = 0;
    sd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    sd.BufferDesc.RefreshRate.Numerator = 60;
    sd.BufferDesc.RefreshRate.Denominator = 1;
    sd.Flags = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    sd.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    sd.OutputWindow = hWnd;
    sd.SampleDesc.Count = 1;
    sd.SampleDesc.Quality = 0;
    sd.Windowed = TRUE;
    sd.SwapEffect = DXGI_SWAP_EFFECT_DISCARD;

    UINT createDeviceFlags = 0;
    //createDeviceFlags |= D3D11_CREATE_DEVICE_DEBUG;
    D3D_FEATURE_LEVEL featureLevel;
    const D3D_FEATURE_LEVEL featureLevelArray[2] = { D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_0, };
    if (D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, createDeviceFlags, featureLevelArray, 2, D3D11_SDK_VERSION, &sd, &g_pSwapChain, &g_pd3dDevice, &featureLevel, &g_pd3dDeviceContext) != S_OK)
        return false;

    CreateRenderTarget();
    return true;
}

void CleanupDeviceD3D()
{
    CleanupRenderTarget();
    if (g_pSwapChain) { g_pSwapChain->Release(); g_pSwapChain = nullptr; }
    if (g_pd3dDeviceContext) { g_pd3dDeviceContext->Release(); g_pd3dDeviceContext = nullptr; }
    if (g_pd3dDevice) { g_pd3dDevice->Release(); g_pd3dDevice = nullptr; }
}

void CreateRenderTarget()
{
    ID3D11Texture2D* pBackBuffer;
    g_pSwapChain->GetBuffer(0, IID_PPV_ARGS(&pBackBuffer));
    g_pd3dDevice->CreateRenderTargetView(pBackBuffer, nullptr, &g_mainRenderTargetView);
    pBackBuffer->Release();
}

void CleanupRenderTarget()
{
    if (g_mainRenderTargetView) { g_mainRenderTargetView->Release(); g_mainRenderTargetView = nullptr; }
}
