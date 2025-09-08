#pragma once
#include <windows.h>
#include <string>
#include <vector>
#include <memory>
#include "GameDataInterface.h"
#include "imgui.h"

// UI Panel types
enum class PanelType {
    STATS,
    COMMENTARY,
    TIPS,
    CONTROLS,
    CHAT
};

// Modern UI Colors and styling with multiple themes
struct UITheme {
    // Background colors
    COLORREF backgroundColor = RGB(18, 18, 18);      // Deep dark background
    COLORREF panelColor = RGB(28, 28, 30);           // Panel background
    COLORREF cardColor = RGB(38, 38, 42);            // Card/elevated surfaces
    COLORREF borderColor = RGB(58, 58, 62);          // Subtle borders
    
    // Text colors
    COLORREF textColor = RGB(255, 255, 255);         // Primary text
    COLORREF textSecondary = RGB(174, 174, 178);     // Secondary text
    COLORREF textMuted = RGB(99, 99, 102);           // Muted text
    
    // Accent and status colors
    COLORREF accentColor = RGB(0, 122, 255);         // iOS-style blue
    COLORREF accentHover = RGB(10, 132, 255);        // Hover state
    COLORREF warningColor = RGB(255, 149, 0);        // Warning orange
    COLORREF errorColor = RGB(255, 59, 48);          // Error red
    COLORREF successColor = RGB(52, 199, 89);        // Success green
    
    // Game-specific colors
    COLORREF player1Color = RGB(52, 199, 89);        // Green for player 1
    COLORREF player2Color = RGB(255, 59, 48);        // Red for player 2
    COLORREF comboColor = RGB(255, 149, 0);          // Orange for combos
    COLORREF killColor = RGB(255, 59, 48);           // Red for kills
    COLORREF techColor = RGB(0, 122, 255);           // Blue for tech
    
    // Fonts
    HFONT titleFont = nullptr;      // 18pt Bold
    HFONT headerFont = nullptr;     // 16pt Semi-bold
    HFONT normalFont = nullptr;     // 14pt Regular
    HFONT smallFont = nullptr;      // 12pt Regular
    HFONT monoFont = nullptr;       // 12pt Monospace for numbers
    
    // Theme variants
    std::string themeName = "Dark Pro";
    bool isDarkTheme = true;
    int cornerRadius = 8;
    int shadowSize = 4;
    int animationDuration = 200; // ms
};

// Predefined themes
enum class ThemeType {
    DARK_PRO,
    DARK_BLUE,
    LIGHT,
    HIGH_CONTRAST,
    MELEE_CLASSIC
};

// Enhanced panel data structures
struct StatsData {
    // Basic stats
    int apm = 0;
    int combos = 0;
    int kills = 0;
    int deaths = 0;
    float damageDealt = 0.0f;
    float damageTaken = 0.0f;
    
    // Character info
    std::string currentCharacter = "Unknown";
    std::string opponentCharacter = "Unknown";
    int characterId = 0;
    int opponentCharacterId = 0;
    
    // Advanced metrics
    float accuracy = 0.0f;
    int techsPerformed = 0;
    int techsMissed = 0;
    int edgeguards = 0;
    int recoveries = 0;
    float averageComboLength = 0.0f;
    int neutralWins = 0;
    int neutralLosses = 0;
    
    // Session data
    DWORD sessionStartTime = 0;
    int gamesPlayed = 0;
    int gamesWon = 0;
    float winRate = 0.0f;
};

struct CommentaryItem {
    std::string text;
    DWORD timestamp;
    bool isImportant;
    std::string eventType;  // "combo", "kill", "tech", "edgeguard", etc.
    COLORREF eventColor = RGB(255, 255, 255);
    int priority = 0;       // Higher priority items stay visible longer
};

struct TipItem {
    std::string title;
    std::string description;
    std::string category;   // "movement", "combo", "neutral", etc.
    bool isActive;
    DWORD showTime;
    int importance = 1;     // 1-5 scale
    bool hasBeenSeen = false;
};

// Animation and visual effects
struct AnimationState {
    bool isAnimating = false;
    DWORD startTime = 0;
    DWORD duration = 200;
    float progress = 0.0f;
    int targetValue = 0;
    int startValue = 0;
    int currentValue = 0;
};

// Character data for visual representation
struct CharacterInfo {
    std::string name;
    COLORREF primaryColor;
    COLORREF secondaryColor;
    std::string iconPath;
    bool hasCustomIcon = false;
};

class CoachingInterface {
public:
    CoachingInterface(HWND parentWindow);
    ~CoachingInterface();
    
    // Main interface methods
    void Paint(HDC hdc);
    void UpdateLayout(const RECT& clientRect, const RECT& gameArea);
    void HandleCommand(WORD commandId);
    
    // Data updates
    void UpdateGameState(const GameState& gameState);
    void AddCommentary(const std::string& text, bool isImportant = false);
    void AddTip(const std::string& title, const std::string& description);
    void UpdateStats(const StatsData& stats);
    
    // Panel management
    void ShowPanel(PanelType panel, bool show = true);
    bool IsPanelVisible(PanelType panel) const;
    void SetPanelSize(PanelType panel, int width, int height);
    
    // Settings and configuration
    void SetTheme(const UITheme& theme);
    void SetTheme(ThemeType themeType);
    void SetFontSize(int size);
    void SetTransparency(int alpha); // 0-255
    
    // Enhanced UI methods
    void AddCommentaryWithType(const std::string& text, const std::string& eventType, bool isImportant = false);
    void SetCharacterInfo(int playerId, const CharacterInfo& info);
    void StartAnimation(const std::string& animationName, int duration = 200);
    void UpdateAnimations();
    
    // Theme management
    UITheme GetTheme(ThemeType themeType) const;
    void LoadCustomTheme(const std::string& filePath);
    void SaveCurrentTheme(const std::string& filePath) const;
    
    void Render();
    void RenderGameWindow();
    HWND GetGameWindowContainer() const { return m_gameWindowContainer; }
    void SetGameWindowContainer(HWND hwnd) { m_gameWindowContainer = hwnd; }
    RECT GetGameWindowContentArea() const { return m_gameContentArea; }

private:
    // ImGui rendering methods
    void RenderPlayerStatsPanel();
    void RenderCommentaryPanel();
    void RenderTipsPanel();
    void RenderControlsPanel();
    void RenderSectionHeader(const char* label);
    void RenderStatRow(const char* label, const char* value);
    void RenderProgressBar(float fraction, const ImVec4& color);
    HWND m_gameWindowContainer = nullptr;
    HWND m_parentWindow;
    UITheme m_theme;
    
    // Layout information
    RECT m_clientRect;
    RECT m_gameArea;
    RECT m_gameContentArea;  // Actual content area coordinates for embedding
    RECT m_leftPanel;
    RECT m_rightPanel;
    RECT m_bottomPanel;
    RECT m_topPanel;
    
    // Panel visibility
    bool m_showLeftPanel = true;
    bool m_showRightPanel = true;
    bool m_showBottomPanel = false;  // Disabled - using menu bar instead
    bool m_showTopPanel = false;
    
    // Data storage
    StatsData m_currentStats;
    std::vector<CommentaryItem> m_commentary;
    std::vector<TipItem> m_tips;
    GameState m_lastGameState;
    
    // Character information
    CharacterInfo m_player1Info;
    CharacterInfo m_player2Info;
    
    // UI state
    int m_scrollPosition = 0;
    int m_selectedTab = 0;
    bool m_isMinimized = false;
    
    // Animation system
    std::vector<AnimationState> m_animations;
    DWORD m_lastAnimationUpdate = 0;
    
    // Enhanced visual state
    int m_hoverElement = -1;
    bool m_isDragging = false;
    POINT m_lastMousePos = {0, 0};
    int m_transparency = 255;
    
    // Drawing methods
    void DrawLeftPanel(HDC hdc);
    void DrawRightPanel(HDC hdc);
    void DrawBottomPanel(HDC hdc);
    void DrawTopPanel(HDC hdc);
    
    // Panel-specific drawing
    void DrawStatsPanel(HDC hdc, const RECT& rect);
    void DrawCommentaryPanel(HDC hdc, const RECT& rect);
    void DrawTipsPanel(HDC hdc, const RECT& rect);
    void DrawControlsPanel(HDC hdc, const RECT& rect);
    
    // Enhanced drawing methods
    void DrawPanel(HDC hdc, const RECT& rect, const std::string& title);
    void DrawModernPanel(HDC hdc, const RECT& rect, const std::string& title, bool elevated = false);
    void DrawText(HDC hdc, const std::string& text, const RECT& rect, UINT format = DT_LEFT);
    void DrawProgressBar(HDC hdc, const RECT& rect, float percentage, COLORREF color);
    void DrawModernProgressBar(HDC hdc, const RECT& rect, float percentage, COLORREF color, bool animated = false);
    void DrawButton(HDC hdc, const RECT& rect, const std::string& text, bool pressed = false);
    void DrawModernButton(HDC hdc, const RECT& rect, const std::string& text, bool pressed = false, bool hovered = false);
    void DrawSeparator(HDC hdc, const RECT& rect);
    void DrawRoundedRect(HDC hdc, const RECT& rect, int radius, COLORREF fillColor, COLORREF borderColor = RGB(0,0,0));
    void DrawGradientRect(HDC hdc, const RECT& rect, COLORREF startColor, COLORREF endColor, bool vertical = true);
    void DrawCharacterIcon(HDC hdc, const RECT& rect, const CharacterInfo& character);
    void DrawStockIndicator(HDC hdc, const RECT& rect, int stocks, int maxStocks, COLORREF color);
    void DrawPercentage(HDC hdc, const RECT& rect, float percentage, COLORREF color, bool large = false);
    void DrawCommentaryBubble(HDC hdc, const RECT& rect, const CommentaryItem& item);
    
    // Layout calculations
    void CalculateLayout();
    RECT GetPanelRect(PanelType panel) const;
    int GetPanelWidth(PanelType panel) const;
    int GetPanelHeight(PanelType panel) const;
    
    // Font and resource management
    void CreateFonts();
    void DestroyFonts();
    void CreateBrushes();
    void DestroyBrushes();
    
    // Resource handles
    HBRUSH m_backgroundBrush = nullptr;
    HBRUSH m_panelBrush = nullptr;
    HBRUSH m_accentBrush = nullptr;
    HPEN m_borderPen = nullptr;
    
    // Enhanced layout constants for better alignment
    static const int PANEL_MARGIN = 16;       // Increased for more breathing room
    static const int PANEL_PADDING = 24;      // Increased for better content spacing
    static const int LEFT_PANEL_WIDTH = 280;
    static const int RIGHT_PANEL_WIDTH = 320;
    static const int BOTTOM_PANEL_HEIGHT = 140;
    static const int TOP_PANEL_HEIGHT = 50;
    static const int MAX_COMMENTARY_ITEMS = 20;
    static const int MAX_TIP_ITEMS = 5;
    
    // Spacing constants
    static const int SECTION_SPACING = 24;    // Increased for better section separation
    static const int LINE_SPACING = 8;        // Increased for better readability
    static const int HEADER_SPACING = 12;     // Increased for better visual hierarchy
    static const int CONTENT_INDENT = 20;     // Increased for better content hierarchy
    static const int CARD_PADDING = 12;       // New constant for consistent card padding
    static const int TEXT_SIDE_MARGIN = 16;   // New constant for text side margins
    
    // Helper methods
    std::string FormatTime(DWORD timestamp) const;
    std::string FormatNumber(float number, int decimals = 1) const;
    RECT InflateRect(const RECT& rect, int dx, int dy) const;
    void CleanupOldItems();
};
