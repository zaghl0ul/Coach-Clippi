#include "CoachingInterface.h"
#include "imgui.h"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <algorithm> // For std::min, std::max

CoachingInterface::CoachingInterface(HWND parentWindow) 
    : m_parentWindow(parentWindow) {
    
    // Initialize layout rectangles
    memset(&m_clientRect, 0, sizeof(RECT));
    memset(&m_gameArea, 0, sizeof(RECT));
    memset(&m_leftPanel, 0, sizeof(RECT));
    memset(&m_rightPanel, 0, sizeof(RECT));
    memset(&m_bottomPanel, 0, sizeof(RECT));
    memset(&m_topPanel, 0, sizeof(RECT));
    
    // Initialize game state
    memset(&m_lastGameState, 0, sizeof(GameState));
    
    // Create fonts and resources
    CreateFonts();
    CreateBrushes();
    
    // Add some sample commentary for demonstration
    AddCommentaryWithType("Welcome to Coach Clippi! Docking system is now active.", "system", false);
    AddCommentaryWithType("Great combo! Fox landed a 4-hit string for 45% damage.", "combo", true);
    AddCommentaryWithType("Nice edgeguard attempt by Falco.", "edgeguard", false);
    AddCommentaryWithType("Tech chase opportunity missed!", "tech", true);
    AddCommentaryWithType("Excellent DI on that kill move!", "kill", false);
    
    // Add a sample tip
    TipItem sampleTip;
    sampleTip.title = "Master Your L-Canceling";
    sampleTip.description = "Practice L-canceling your aerials to reduce landing lag by 50%. This technique is essential for maintaining pressure and creating combo opportunities.";
    sampleTip.category = "movement";
    sampleTip.importance = 4;
    sampleTip.isActive = true;
    sampleTip.showTime = GetTickCount();
    m_tips.push_back(sampleTip);
    
    std::wcout << L"CoachingInterface initialized with docking support" << std::endl;
}

CoachingInterface::~CoachingInterface() {
    DestroyFonts();
    DestroyBrushes();
}

void CoachingInterface::Paint(HDC hdc) {
    // Set background mode for text
    SetBkMode(hdc, TRANSPARENT);
    
    // Draw panels
    if (m_showLeftPanel) {
        DrawLeftPanel(hdc);
    }
    
    if (m_showRightPanel) {
        DrawRightPanel(hdc);
    }
    
    if (m_showBottomPanel) {
        DrawBottomPanel(hdc);
    }
    
    if (m_showTopPanel) {
        DrawTopPanel(hdc);
    }
}

void CoachingInterface::UpdateLayout(const RECT& clientRect, const RECT& gameArea) {
    // Store the client and game area rectangles
    m_clientRect = clientRect;
    m_gameArea = gameArea;
    
    // Check if game area is valid (non-zero dimensions)
    bool hasValidGameArea = (gameArea.right > gameArea.left && gameArea.bottom > gameArea.top);
    
    // Log layout information for debugging
    std::wcout << L"UpdateLayout: Client area: "
              << m_clientRect.right - m_clientRect.left << L"x"
              << m_clientRect.bottom - m_clientRect.top << std::endl;
              
    if (hasValidGameArea) {
        std::wcout << L"UpdateLayout: Game area: "
                  << m_gameArea.right - m_gameArea.left << L"x"
                  << m_gameArea.bottom - m_gameArea.top
                  << L" at (" << m_gameArea.left << L"," << m_gameArea.top << L")"
                  << std::endl;
    } else {
        std::wcout << L"UpdateLayout: No valid game area" << std::endl;
    }
    
    // Calculate panel layout based on client and game areas
    CalculateLayout();
    
    // ImGui handles all rendering - no need for GDI invalidation
}

void CoachingInterface::HandleCommand(WORD commandId) {
    // Handle UI commands (buttons, menu items, etc.)
    switch (commandId) {
        case 1001: // Toggle left panel
            ShowPanel(PanelType::STATS, !m_showLeftPanel);
            break;
        case 1002: // Toggle right panel
            ShowPanel(PanelType::COMMENTARY, !m_showRightPanel);
            break;
        case 1003: // Toggle bottom panel
            ShowPanel(PanelType::CONTROLS, !m_showBottomPanel);
            break;
        default:
            break;
    }
}

void CoachingInterface::UpdateGameState(const GameState& gameState) {
    m_lastGameState = gameState;
    
    // Update stats based on game state
    if (gameState.activePlayerCount >= 2) {
        // Calculate damage dealt/taken
        float player1Damage = gameState.players[0].damage;
        float player2Damage = gameState.players[1].damage;
        
        // Simple damage tracking (in a real implementation, track deltas)
        m_currentStats.damageTaken = player1Damage;
        m_currentStats.damageDealt = player2Damage;
        
        // Update character info
        m_currentStats.currentCharacter = "Player 1"; // Would map character ID to name
        m_currentStats.opponentCharacter = "Player 2";
    }
    
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::AddCommentary(const std::string& text, bool isImportant) {
    CommentaryItem item;
    item.text = text;
    item.timestamp = GetTickCount();
    item.isImportant = isImportant;
    
    m_commentary.push_back(item);
    
    // Keep only recent items
    if (m_commentary.size() > MAX_COMMENTARY_ITEMS) {
        m_commentary.erase(m_commentary.begin());
    }
    
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::AddCommentaryWithType(const std::string& text, const std::string& eventType, bool isImportant) {
    CommentaryItem item;
    item.text = text;
    item.timestamp = GetTickCount();
    item.isImportant = isImportant;
    item.eventType = eventType;
    
    // Set event color based on type
    if (eventType == "combo") {
        item.eventColor = RGB(255, 165, 0); // Orange
    } else if (eventType == "kill") {
        item.eventColor = RGB(255, 100, 100); // Red
    } else if (eventType == "tech") {
        item.eventColor = RGB(0, 150, 255); // Blue
    } else if (eventType == "edgeguard") {
        item.eventColor = RGB(100, 255, 100); // Green
    } else {
        item.eventColor = RGB(255, 255, 255); // White for system/other
    }
    
    m_commentary.push_back(item);
    
    // Keep only recent items
    if (m_commentary.size() > MAX_COMMENTARY_ITEMS) {
        m_commentary.erase(m_commentary.begin());
    }
    
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::AddTip(const std::string& title, const std::string& description) {
    TipItem tip;
    tip.title = title;
    tip.description = description;
    tip.isActive = true;
    tip.showTime = GetTickCount();
    
    m_tips.push_back(tip);
    
    // Keep only recent tips
    if (m_tips.size() > MAX_TIP_ITEMS) {
        m_tips.erase(m_tips.begin());
    }
    
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::UpdateStats(const StatsData& stats) {
    m_currentStats = stats;
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::ShowPanel(PanelType panel, bool show) {
    switch (panel) {
        case PanelType::STATS:
            m_showLeftPanel = show;
            break;
        case PanelType::COMMENTARY:
            m_showRightPanel = show;
            break;
        case PanelType::CONTROLS:
            m_showBottomPanel = show;
            break;
        case PanelType::TIPS:
            m_showTopPanel = show;
            break;
        default:
            break;
    }
    
    // Recalculate layout - ImGui handles rendering updates
    CalculateLayout();
}

bool CoachingInterface::IsPanelVisible(PanelType panel) const {
    switch (panel) {
        case PanelType::STATS: return m_showLeftPanel;
        case PanelType::COMMENTARY: return m_showRightPanel;
        case PanelType::CONTROLS: return m_showBottomPanel;
        case PanelType::TIPS: return m_showTopPanel;
        default: return false;
    }
}

void CoachingInterface::SetTheme(const UITheme& theme) {
    m_theme = theme;
    
    // Recreate brushes with new colors
    DestroyBrushes();
    CreateBrushes();
    
    // ImGui handles all rendering updates automatically
}

void CoachingInterface::DrawLeftPanel(HDC hdc) {
    DrawPanel(hdc, m_leftPanel, "Player Stats");
    
    RECT contentRect = InflateRect(m_leftPanel, -PANEL_PADDING, -PANEL_PADDING);
    contentRect.top += 25; // Account for title
    
    DrawStatsPanel(hdc, contentRect);
}

void CoachingInterface::DrawRightPanel(HDC hdc) {
    DrawPanel(hdc, m_rightPanel, "Live Commentary");
    
    RECT contentRect = InflateRect(m_rightPanel, -PANEL_PADDING, -PANEL_PADDING);
    contentRect.top += 25; // Account for title
    
    DrawCommentaryPanel(hdc, contentRect);
}

void CoachingInterface::DrawBottomPanel(HDC hdc) {
    DrawPanel(hdc, m_bottomPanel, "Controls & Tips");
    
    RECT contentRect = InflateRect(m_bottomPanel, -PANEL_PADDING, -PANEL_PADDING);
    contentRect.top += 25; // Account for title
    
    DrawControlsPanel(hdc, contentRect);
}

void CoachingInterface::DrawTopPanel(HDC hdc) {
    DrawPanel(hdc, m_topPanel, "Active Tips");
    
    RECT contentRect = InflateRect(m_topPanel, -PANEL_PADDING, -PANEL_PADDING);
    contentRect.top += 25; // Account for title
    
    DrawTipsPanel(hdc, contentRect);
}

void CoachingInterface::DrawStatsPanel(HDC hdc, const RECT& rect) {
    // Calculate dynamic spacing based on panel dimensions
    int panelWidth = rect.right - rect.left;
    int panelHeight = rect.bottom - rect.top;
    
    // Scale spacing values based on panel size
    int dynamicPadding = std::max(10, panelHeight / 30);
    int dynamicLineHeight = std::max(18, panelHeight / 25);
    int dynamicSectionGap = std::max(16, panelHeight / 20);
    int dynamicHeaderMargin = std::max(8, panelHeight / 40);
    int dynamicItemSpacing = std::max(6, panelHeight / 50);
    int dynamicIndent = std::max(12, panelWidth / 20);
    
    // Start position
    int y = rect.top + dynamicPadding;
    
    // Character Section Header
    SelectObject(hdc, m_theme.headerFont);
    SetTextColor(hdc, RGB(0, 150, 255));
    RECT headerRect = {rect.left, y, rect.right, y + dynamicLineHeight};
    ::DrawTextA(hdc, "CHARACTERS", -1, &headerRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicHeaderMargin;
    
    // Character info with proper alignment
    SelectObject(hdc, m_theme.normalFont);
    SetTextColor(hdc, RGB(255, 255, 255));
    
    RECT charRect1 = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
    ::DrawTextA(hdc, "You: Fox", -1, &charRect1, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicItemSpacing;
    
    RECT charRect2 = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
    ::DrawTextA(hdc, "Opponent: Falco", -1, &charRect2, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicSectionGap;
    
    // Performance Section Header
    SelectObject(hdc, m_theme.headerFont);
    SetTextColor(hdc, RGB(0, 150, 255));
    RECT perfHeaderRect = {rect.left, y, rect.right, y + dynamicLineHeight};
    ::DrawTextA(hdc, "PERFORMANCE", -1, &perfHeaderRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicHeaderMargin;
    
    // Performance stats with consistent spacing
    SelectObject(hdc, m_theme.normalFont);
    
    // APM
    SetTextColor(hdc, RGB(0, 255, 0));
    RECT apmRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
    ::DrawTextA(hdc, "APM: 180 (Good)", -1, &apmRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicItemSpacing;
    
    // Combos
    SetTextColor(hdc, RGB(255, 165, 0));
    RECT comboRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
    ::DrawTextA(hdc, "Combos: 12", -1, &comboRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicItemSpacing;
    
    // K/D Ratio
    SetTextColor(hdc, RGB(255, 100, 100));
    RECT kdRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
    ::DrawTextA(hdc, "K/D: 3/1 (3.0)", -1, &kdRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicSectionGap;
    
    // Damage Section Header
    SelectObject(hdc, m_theme.headerFont);
    SetTextColor(hdc, RGB(0, 150, 255));
    RECT damageHeaderRect = {rect.left, y, rect.right, y + dynamicLineHeight};
    ::DrawTextA(hdc, "DAMAGE", -1, &damageHeaderRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += dynamicLineHeight + dynamicHeaderMargin;
    
    // Calculate dynamic bar heights and spacing
    int barLabelHeight = std::max(14, dynamicLineHeight - 4);
    int barHeight = std::max(10, panelHeight / 40);
    int barSpacing = std::max(16, panelHeight / 30);
    int percentWidth = std::max(45, panelWidth / 6);
    
    // Damage bars with proper alignment
    SelectObject(hdc, m_theme.smallFont);
    SetTextColor(hdc, RGB(180, 180, 180));
    
    // Dealt label
    RECT dealtLabelRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + barLabelHeight};
    ::DrawTextA(hdc, "Dealt", -1, &dealtLabelRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += barLabelHeight + dynamicItemSpacing/2;
    
    // Dealt progress bar
    RECT dealtBarRect = {rect.left + dynamicIndent, y, rect.right - percentWidth - dynamicPadding/2, y + barHeight};
    DrawProgressBar(hdc, dealtBarRect, 0.6f, RGB(0, 255, 0));
    
    // Dealt percentage
    SelectObject(hdc, m_theme.monoFont);
    SetTextColor(hdc, RGB(255, 255, 255));
    RECT dealtPctRect = {rect.right - percentWidth, y - 2, rect.right - dynamicPadding, y + barHeight + 4};
    ::DrawTextA(hdc, "180%", -1, &dealtPctRect, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    y += barHeight + barSpacing;
    
    // Taken label
    SelectObject(hdc, m_theme.smallFont);
    SetTextColor(hdc, RGB(180, 180, 180));
    RECT takenLabelRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + barLabelHeight};
    ::DrawTextA(hdc, "Taken", -1, &takenLabelRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += barLabelHeight + dynamicItemSpacing/2;
    
    // Taken progress bar
    RECT takenBarRect = {rect.left + dynamicIndent, y, rect.right - percentWidth - dynamicPadding/2, y + barHeight};
    DrawProgressBar(hdc, takenBarRect, 0.3f, RGB(255, 100, 100));
    
    // Taken percentage
    SelectObject(hdc, m_theme.monoFont);
    SetTextColor(hdc, RGB(255, 255, 255));
    RECT takenPctRect = {rect.right - percentWidth, y - 2, rect.right - dynamicPadding, y + barHeight + 4};
    ::DrawTextA(hdc, "90%", -1, &takenPctRect, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    y += barHeight + dynamicSectionGap;
    
    // Session info if there's space - calculate dynamically
    int remainingSpace = rect.bottom - y;
    int requiredSpace = dynamicLineHeight * 3 + dynamicHeaderMargin + dynamicItemSpacing * 2;
    
    if (remainingSpace >= requiredSpace) {
        SelectObject(hdc, m_theme.headerFont);
        SetTextColor(hdc, RGB(0, 150, 255));
        RECT sessionHeaderRect = {rect.left, y, rect.right, y + dynamicLineHeight};
        ::DrawTextA(hdc, "SESSION", -1, &sessionHeaderRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        y += dynamicLineHeight + dynamicHeaderMargin;
        
        SelectObject(hdc, m_theme.normalFont);
        SetTextColor(hdc, RGB(200, 200, 200));
        RECT gamesRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
        ::DrawTextA(hdc, "Games: 5", -1, &gamesRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        y += dynamicLineHeight + dynamicItemSpacing;
        
        SetTextColor(hdc, RGB(0, 255, 0));
        RECT winRateRect = {rect.left + dynamicIndent, y, rect.right - dynamicPadding, y + dynamicLineHeight};
        ::DrawTextA(hdc, "Win Rate: 80%", -1, &winRateRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    }
}

void CoachingInterface::DrawCommentaryPanel(HDC hdc, const RECT& rect) {
    // Add some sample commentary for demonstration
    if (m_commentary.empty()) {
        // Add sample commentary items to show the UI improvements
        CommentaryItem sample1;
        sample1.text = "Great combo! Fox landed a 4-hit string for 45% damage.";
        sample1.timestamp = GetTickCount() - 5000;
        sample1.isImportant = true;
        sample1.eventType = "combo";
        m_commentary.push_back(sample1);
        
        CommentaryItem sample2;
        sample2.text = "Nice edgeguard attempt by Falco.";
        sample2.timestamp = GetTickCount() - 12000;
        sample2.isImportant = false;
        sample2.eventType = "edgeguard";
        m_commentary.push_back(sample2);
        
        CommentaryItem sample3;
        sample3.text = "Tech chase opportunity missed!";
        sample3.timestamp = GetTickCount() - 8000;
        sample3.isImportant = true;
        sample3.eventType = "tech";
        m_commentary.push_back(sample3);
    }
    
    if (m_commentary.empty()) {
        // Show empty state with better styling
        SelectObject(hdc, m_theme.normalFont);
        SetTextColor(hdc, RGB(150, 150, 150));
        DrawText(hdc, "Commentary will appear here during gameplay",
                 {rect.left + TEXT_SIDE_MARGIN, rect.top + PANEL_PADDING,
                  rect.right - TEXT_SIDE_MARGIN, rect.bottom - PANEL_PADDING},
                 DT_CENTER | DT_VCENTER | DT_WORDBREAK);
        return;
    }
    
    // Calculate dynamic spacing based on panel dimensions
    int panelWidth = rect.right - rect.left;
    int panelHeight = rect.bottom - rect.top;
    
    // Scale spacing values based on panel size
    int dynamicPadding = std::max(10, panelHeight / 30);
    int dynamicItemSpacing = std::max(12, panelHeight / 25);
    int dynamicCardPadding = std::max(8, panelHeight / 40);
    int dynamicSideMargin = std::max(12, panelWidth / 20);
    int dynamicAccentWidth = std::max(3, panelWidth / 80);
    
    // Calculate text width dynamically
    int timestampWidth = std::max(60, panelWidth / 5);
    int maxTextWidth = panelWidth - (dynamicSideMargin * 2) - timestampWidth - dynamicAccentWidth - 10;
    
    // Start position
    int y = rect.bottom - dynamicPadding;
    
    // Draw commentary items from newest to oldest with dynamic spacing
    for (auto it = m_commentary.rbegin(); it != m_commentary.rend() && y > rect.top + dynamicPadding*2; ++it) {
        const auto& item = *it;
        
        // Determine colors based on event type
        COLORREF textColor = RGB(255, 255, 255);  // Force white text for readability
        COLORREF bgColor = RGB(35, 35, 40);       // Darker background for better contrast
        COLORREF accentColor = RGB(0, 150, 255);  // Default blue
        
        if (!item.eventType.empty()) {
            if (item.eventType == "combo") {
                accentColor = RGB(255, 165, 0);   // Orange for combos
                bgColor = RGB(40, 35, 30);        // Slightly orange-tinted background
            } else if (item.eventType == "kill") {
                accentColor = RGB(255, 100, 100); // Red for kills
                bgColor = RGB(40, 30, 30);        // Slightly red-tinted background
            } else if (item.eventType == "tech") {
                accentColor = RGB(0, 150, 255);   // Blue for tech
                bgColor = RGB(30, 35, 40);        // Slightly blue-tinted background
            } else if (item.eventType == "edgeguard") {
                accentColor = RGB(100, 255, 100); // Green for edgeguards
                bgColor = RGB(30, 40, 30);        // Slightly green-tinted background
            }
        }
        
        // Calculate proper text dimensions with dynamic measurement
        SelectObject(hdc, m_theme.normalFont);
        RECT measureRect = {0, 0, maxTextWidth, 0};
        int textHeight = ::DrawTextA(hdc, item.text.c_str(), -1, &measureRect, DT_CALCRECT | DT_WORDBREAK);
        
        // Ensure minimum height and add proper padding - scale with panel size
        int minCardHeight = std::max(30, panelHeight / 12);
        int itemHeight = std::max(textHeight + (dynamicCardPadding * 2), minCardHeight);
        int itemTop = y - itemHeight;
        
        if (itemTop < rect.top + dynamicPadding*2) break; // Ensure we don't go outside panel bounds
        
        // Draw item background card with dynamic margins
        RECT itemRect = {
            rect.left + dynamicSideMargin,
            itemTop,
            rect.right - dynamicSideMargin,
            y
        };
        HBRUSH itemBrush = CreateSolidBrush(bgColor);
        FillRect(hdc, &itemRect, itemBrush);
        DeleteObject(itemBrush);
        
        // Draw left accent bar with dynamic thickness
        RECT accentRect = {
            rect.left + dynamicSideMargin,
            itemTop,
            rect.left + dynamicSideMargin + dynamicAccentWidth,
            y
        };
        HBRUSH accentBrush = CreateSolidBrush(accentColor);
        FillRect(hdc, &accentRect, accentBrush);
        DeleteObject(accentBrush);
        
        // Calculate text positioning dynamically
        int textLeftMargin = dynamicSideMargin + dynamicAccentWidth + std::max(8, panelWidth / 40);
        
        // Draw commentary text with dynamic padding and alignment
        SetTextColor(hdc, textColor);
        RECT textRect = {
            rect.left + textLeftMargin,
            itemTop + dynamicCardPadding,
            rect.right - dynamicSideMargin - timestampWidth,
            y - dynamicCardPadding
        };
        ::DrawTextA(hdc, item.text.c_str(), -1, &textRect, DT_WORDBREAK | DT_TOP);
        
        // Draw timestamp in top-right with dynamic positioning
        SelectObject(hdc, m_theme.smallFont);
        SetTextColor(hdc, RGB(180, 180, 180));  // Lighter gray for better visibility
        std::string timeStr = FormatTime(item.timestamp);
        RECT timeRect = {
            rect.right - timestampWidth,
            itemTop + dynamicCardPadding,
            rect.right - dynamicSideMargin,
            itemTop + dynamicCardPadding + std::max(16, panelHeight / 25)
        };
        ::DrawTextA(hdc, timeStr.c_str(), -1, &timeRect, DT_RIGHT | DT_TOP);
        
        // Draw event type badge with dynamic positioning
        if (!item.eventType.empty() && item.eventType != "general") {
            SelectObject(hdc, m_theme.smallFont);
            SetTextColor(hdc, accentColor);
            std::string eventBadge = "[" + item.eventType + "]";
            
            int badgeTopOffset = dynamicCardPadding + std::max(18, panelHeight / 22);
            RECT badgeRect = {
                rect.right - timestampWidth,
                itemTop + badgeTopOffset,
                rect.right - dynamicSideMargin,
                itemTop + badgeTopOffset + std::max(16, panelHeight / 25)
            };
            ::DrawTextA(hdc, eventBadge.c_str(), -1, &badgeRect, DT_RIGHT | DT_TOP);
        }
        
        y = itemTop - dynamicItemSpacing; // Dynamic spacing between cards
    }
    
    // Draw scroll indicator with dynamic positioning
    int visibleItems = std::max(3, panelHeight / 120); // Calculate how many items fit based on panel height
    if (m_commentary.size() > visibleItems) {
        SelectObject(hdc, m_theme.smallFont);
        SetTextColor(hdc, RGB(140, 140, 140));
        std::string scrollText = "+" + std::to_string(m_commentary.size() - visibleItems) + " more items...";
        RECT scrollRect = {
            rect.left + dynamicSideMargin,
            rect.top + dynamicPadding/2,
            rect.right - dynamicSideMargin,
            rect.top + dynamicPadding + std::max(16, panelHeight / 25)
        };
        ::DrawTextA(hdc, scrollText.c_str(), -1, &scrollRect, DT_CENTER | DT_TOP);
    }
}

void CoachingInterface::DrawTipsPanel(HDC hdc, const RECT& rect) {
    // Calculate dynamic spacing based on panel dimensions
    int panelWidth = rect.right - rect.left;
    int panelHeight = rect.bottom - rect.top;
    
    // Scale spacing values based on panel size
    int dynamicPadding = std::max(10, panelHeight / 30);
    int dynamicSideMargin = std::max(12, panelWidth / 20);
    int dynamicIndent = std::max(12, panelWidth / 25);
    int dynamicLineHeight = std::max(18, panelHeight / 3); // Tips panel is usually shorter
    
    // Calculate content rectangle with dynamic margins
    RECT contentRect = {
        rect.left + dynamicSideMargin,
        rect.top + dynamicPadding,
        rect.right - dynamicSideMargin,
        rect.bottom - dynamicPadding
    };
    
    if (!m_tips.empty()) {
        const auto& tip = m_tips.back(); // Show most recent tip
        
        // Draw tip title with dynamic styling
        SelectObject(hdc, m_theme.headerFont);
        SetTextColor(hdc, RGB(0, 150, 255)); // Bright blue for title
        
        int titleHeight = std::max(22, panelHeight / 3);
        RECT titleRect = {
            contentRect.left,
            contentRect.top,
            contentRect.right - (panelWidth / 4), // Leave space for badge
            contentRect.top + titleHeight
        };
        
        DrawText(hdc, tip.title.c_str(), titleRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        
        // Draw tip description with dynamic styling and wrapping
        SelectObject(hdc, m_theme.normalFont);
        SetTextColor(hdc, RGB(230, 230, 230)); // Slightly off-white for better readability
        
        // Calculate description rectangle dynamically
        RECT descRect = {
            contentRect.left + dynamicIndent,
            titleRect.bottom + std::max(4, panelHeight / 20),
            contentRect.right,
            contentRect.bottom
        };
        
        DrawText(hdc, tip.description.c_str(), descRect, DT_LEFT | DT_WORDBREAK);
        
        // Draw category badge if available
        if (!tip.category.empty()) {
            SelectObject(hdc, m_theme.smallFont);
            
            // Choose color based on category
            COLORREF categoryColor = RGB(0, 150, 255); // Default blue
            if (tip.category == "movement") {
                categoryColor = RGB(100, 255, 100); // Green
            } else if (tip.category == "combo") {
                categoryColor = RGB(255, 165, 0); // Orange
            } else if (tip.category == "neutral") {
                categoryColor = RGB(180, 180, 255); // Light blue
            }
            
            SetTextColor(hdc, categoryColor);
            
            std::string categoryText = "[" + tip.category + "]";
            int badgeWidth = std::max(80, panelWidth / 5);
            RECT categoryRect = {
                contentRect.right - badgeWidth,
                contentRect.top,
                contentRect.right,
                contentRect.top + titleHeight
            };
            
            DrawText(hdc, categoryText.c_str(), categoryRect, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
        }
        
        // Draw importance indicator if high importance
        if (tip.importance >= 4) {
            SelectObject(hdc, m_theme.smallFont);
            SetTextColor(hdc, RGB(255, 100, 100)); // Red for important tips
            
            int badgeWidth = std::max(80, panelWidth / 5);
            int importanceHeight = std::max(16, panelHeight / 4);
            RECT importanceRect = {
                contentRect.right - badgeWidth,
                contentRect.top + titleHeight,
                contentRect.right,
                contentRect.top + titleHeight + importanceHeight
            };
            
            DrawText(hdc, "IMPORTANT", importanceRect, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
        }
    } else {
        // Empty state with dynamic styling
        SelectObject(hdc, m_theme.normalFont);
        SetTextColor(hdc, RGB(140, 140, 140));
        DrawText(hdc, "No active tips", contentRect, DT_CENTER | DT_VCENTER);
    }
}

void CoachingInterface::DrawControlsPanel(HDC hdc, const RECT& rect) {
    // Draw some control buttons
    int buttonWidth = 80;
    int buttonHeight = 25;
    int spacing = 10;
    
    RECT buttonRect = {rect.left, rect.top, rect.left + buttonWidth, rect.top + buttonHeight};
    
    DrawButton(hdc, buttonRect, "Settings");
    
    buttonRect.left += buttonWidth + spacing;
    buttonRect.right += buttonWidth + spacing;
    DrawButton(hdc, buttonRect, "Reset");
    
    buttonRect.left += buttonWidth + spacing;
    buttonRect.right += buttonWidth + spacing;
    DrawButton(hdc, buttonRect, "Export");
    
    // Draw game info
    SelectObject(hdc, m_theme.smallFont);
    SetTextColor(hdc, m_theme.textColor);
    
    RECT infoRect = {rect.left, rect.top + buttonHeight + 10, rect.right, rect.bottom};
    
    std::string gameInfo = "Frame: " + std::to_string(m_lastGameState.frameCount);
    if (m_lastGameState.isInGame) {
        gameInfo += " | In Game";
    } else {
        gameInfo += " | Menu";
    }
    
    DrawText(hdc, gameInfo, infoRect, DT_LEFT);
}

void CoachingInterface::DrawPanel(HDC hdc, const RECT& rect, const std::string& title) {
    // Calculate dynamic values based on panel dimensions and game area
    int panelWidth = rect.right - rect.left;
    int panelHeight = rect.bottom - rect.top;
    
    // Check if panel is adjacent to game area for special styling
    bool isLeftOfGame = (m_gameArea.left > 0 && rect.right == m_gameArea.left - PANEL_MARGIN);
    bool isRightOfGame = (m_gameArea.right > 0 && rect.left == m_gameArea.right + PANEL_MARGIN);
    bool isAboveGame = (m_gameArea.top > 0 && rect.bottom == m_gameArea.top - PANEL_MARGIN);
    bool isBelowGame = (m_gameArea.bottom > 0 && rect.top == m_gameArea.bottom + PANEL_MARGIN);
    bool isAdjacentToGame = isLeftOfGame || isRightOfGame || isAboveGame || isBelowGame;
    
    // Calculate dynamic padding based on panel size
    int dynamicPadding = std::max(12, panelWidth / 25);
    int titleHeight = std::max(24, panelHeight / 20);
    int sepThickness = std::max(1, panelHeight / 200);
    int borderThickness = std::max(2, panelWidth / 150);
    
    // Fill panel background with semi-transparent effect
    HBRUSH panelBrush = CreateSolidBrush(RGB(25, 25, 30));
    FillRect(hdc, &rect, panelBrush);
    DeleteObject(panelBrush);
    
    // Draw border with dynamic thickness and special styling for game-adjacent panels
    COLORREF borderColor = isAdjacentToGame ? RGB(0, 122, 255) : RGB(58, 58, 62);
    HPEN borderPen = CreatePen(PS_SOLID, borderThickness, borderColor);
    HPEN oldPen = (HPEN)SelectObject(hdc, borderPen);
    
    // Draw the border
    Rectangle(hdc, rect.left, rect.top, rect.right, rect.bottom);
    
    // For panels adjacent to game, draw a special accent on the game-facing edge
    if (isAdjacentToGame) {
        HPEN accentPen = CreatePen(PS_SOLID, borderThickness * 2, RGB(0, 150, 255));
        SelectObject(hdc, accentPen);
        
        if (isLeftOfGame) {
            MoveToEx(hdc, rect.right - 1, rect.top, nullptr);
            LineTo(hdc, rect.right - 1, rect.bottom);
        } else if (isRightOfGame) {
            MoveToEx(hdc, rect.left, rect.top, nullptr);
            LineTo(hdc, rect.left, rect.bottom);
        } else if (isAboveGame) {
            MoveToEx(hdc, rect.left, rect.bottom - 1, nullptr);
            LineTo(hdc, rect.right, rect.bottom - 1);
        } else if (isBelowGame) {
            MoveToEx(hdc, rect.left, rect.top, nullptr);
            LineTo(hdc, rect.right, rect.top);
        }
        
        DeleteObject(accentPen);
    }
    
    SelectObject(hdc, oldPen);
    DeleteObject(borderPen);
    
    // Draw title with dynamic alignment and spacing
    if (!title.empty()) {
        SelectObject(hdc, m_theme.titleFont);
        SetTextColor(hdc, RGB(0, 150, 255));  // Bright blue titles
        
        // Dynamic title positioning
        RECT titleRect = {
            rect.left + dynamicPadding,
            rect.top + dynamicPadding/3,
            rect.right - dynamicPadding,
            rect.top + dynamicPadding/3 + titleHeight
        };
        ::DrawTextA(hdc, title.c_str(), -1, &titleRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        
        // Draw separator line with dynamic positioning
        HPEN sepPen = CreatePen(PS_SOLID, sepThickness, RGB(0, 150, 255));
        HPEN oldSepPen = (HPEN)SelectObject(hdc, sepPen);
        
        int sepY = titleRect.bottom + std::max(2, panelHeight / 100);
        MoveToEx(hdc, rect.left + dynamicPadding, sepY, nullptr);
        LineTo(hdc, rect.right - dynamicPadding, sepY);
        
        SelectObject(hdc, oldSepPen);
        DeleteObject(sepPen);
    }
}

void CoachingInterface::DrawText(HDC hdc, const std::string& text, const RECT& rect, UINT format) {
    // Enhanced text rendering with proper null-termination handling
    if (text.empty()) {
        return;  // Don't try to draw empty text
    }
    
    // Calculate rect dimensions for potential scaling
    int rectWidth = rect.right - rect.left;
    int rectHeight = rect.bottom - rect.top;
    
    // Use a consistent approach to text rendering
    RECT adjustedRect = rect;  // Create a copy to avoid modifying the original
    
    // For single line text, ensure vertical centering works properly
    if ((format & DT_SINGLELINE) && (format & DT_VCENTER)) {
        // Adjust rect for better vertical centering based on font height
        TEXTMETRIC tm;
        GetTextMetrics(hdc, &tm);
        int fontHeight = tm.tmHeight;
        
        // Only adjust if the rect is taller than the font
        if (rectHeight > fontHeight) {
            int yOffset = (rectHeight - fontHeight) / 2;
            adjustedRect.top += yOffset;
            adjustedRect.bottom -= yOffset;
        }
    }
    
    // For word-wrapped text, ensure proper line spacing
    if (format & DT_WORDBREAK) {
        // Add DT_NOCLIP to prevent clipping of descenders
        format |= DT_NOCLIP;
    }
    
    // Apply consistent text rendering with proper format flags
    ::DrawTextA(hdc, text.c_str(), -1, &adjustedRect, format);
}

void CoachingInterface::DrawProgressBar(HDC hdc, const RECT& rect, float percentage, COLORREF color) {
    // Clamp percentage
    percentage = std::max(0.0f, std::min(1.0f, percentage));
    
    // Calculate proper dimensions for consistent appearance
    RECT barRect = rect;
    
    // Draw background with slightly darker color for better contrast
    HBRUSH bgBrush = CreateSolidBrush(RGB(50, 50, 54));
    FillRect(hdc, &barRect, bgBrush);
    DeleteObject(bgBrush);
    
    // Draw progress with proper dimensions
    if (percentage > 0) {
        RECT progressRect = barRect;
        progressRect.right = progressRect.left + (int)((progressRect.right - progressRect.left) * percentage);
        
        // Create a slightly brighter color for better visual appeal
        COLORREF brightColor = RGB(
            std::min(255, GetRValue(color) + 20),
            std::min(255, GetGValue(color) + 20),
            std::min(255, GetBValue(color) + 20)
        );
        
        HBRUSH progressBrush = CreateSolidBrush(brightColor);
        FillRect(hdc, &progressRect, progressBrush);
        DeleteObject(progressBrush);
    }
    
    // Draw border with consistent style
    HPEN borderPen = CreatePen(PS_SOLID, 1, RGB(100, 100, 100));
    HPEN oldPen = (HPEN)SelectObject(hdc, borderPen);
    Rectangle(hdc, barRect.left, barRect.top, barRect.right, barRect.bottom);
    SelectObject(hdc, oldPen);
    DeleteObject(borderPen);
}

void CoachingInterface::DrawButton(HDC hdc, const RECT& rect, const std::string& text, bool pressed) {
    // Draw button background
    COLORREF buttonColor = pressed ? RGB(64, 64, 64) : RGB(80, 80, 80);
    HBRUSH buttonBrush = CreateSolidBrush(buttonColor);
    FillRect(hdc, &rect, buttonBrush);
    DeleteObject(buttonBrush);
    
    // Draw border
    HPEN borderPen = CreatePen(PS_SOLID, 1, RGB(128, 128, 128));
    HPEN oldPen = (HPEN)SelectObject(hdc, borderPen);
    Rectangle(hdc, rect.left, rect.top, rect.right, rect.bottom);
    SelectObject(hdc, oldPen);
    DeleteObject(borderPen);
    
    // Draw text
    SelectObject(hdc, m_theme.normalFont);
    SetTextColor(hdc, m_theme.textColor);
    DrawText(hdc, text, rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}

void CoachingInterface::DrawSeparator(HDC hdc, const RECT& rect) {
    HPEN sepPen = CreatePen(PS_SOLID, 1, RGB(96, 96, 96));
    HPEN oldPen = (HPEN)SelectObject(hdc, sepPen);
    
    MoveToEx(hdc, rect.left, rect.top, nullptr);
    LineTo(hdc, rect.right, rect.top);
    
    SelectObject(hdc, oldPen);
    DeleteObject(sepPen);
}

void CoachingInterface::CalculateLayout() {
    int clientWidth = m_clientRect.right - m_clientRect.left;
    int clientHeight = m_clientRect.bottom - m_clientRect.top;
    
    // Use dynamic panel margin based on window size
    int panelMargin = std::max(12, clientWidth / 100);
    
    // Calculate game area dimensions
    int gameWidth = m_gameArea.right - m_gameArea.left;
    int gameHeight = m_gameArea.bottom - m_gameArea.top;
    
    // Check if we have a valid game area
    bool hasGameArea = (gameWidth > 0 && gameHeight > 0);
    
    // Calculate panel widths dynamically based on available space
    // If game area exists, use it as reference; otherwise use client area
    int availableWidth = hasGameArea ?
        (clientWidth - gameWidth - (panelMargin * 4)) :
        clientWidth;
    
    // Calculate panel widths as percentages of available space
    int leftWidth = m_showLeftPanel ? std::max(240, availableWidth / 2) : 0;
    int rightWidth = m_showRightPanel ? std::max(300, availableWidth / 2) : 0;
    
    // Ensure panels don't exceed reasonable maximums but are large enough for content
    int maxPanelWidth = std::max(340, clientWidth / 4);
    leftWidth = std::min(leftWidth, maxPanelWidth);
    rightWidth = std::min(rightWidth, maxPanelWidth);
    
    // Calculate panel heights
    int bottomHeight = m_showBottomPanel ? std::max(90, clientHeight / 10) : 0;
    int topHeight = m_showTopPanel ? std::max(50, clientHeight / 16) : 0;
    
    // Position panels relative to game area if it exists
    if (hasGameArea) {
        // Left panel - positioned to the left of the game area
        m_leftPanel = {
            m_clientRect.left + panelMargin,
            m_clientRect.top + panelMargin,
            m_gameArea.left - panelMargin,
            m_clientRect.bottom - panelMargin
        };
        
        // Right panel - positioned to the right of the game area
        m_rightPanel = {
            m_gameArea.right + panelMargin,
            m_clientRect.top + panelMargin,
            m_clientRect.right - panelMargin,
            m_clientRect.bottom - panelMargin
        };
        
        // Bottom panel - positioned below the game area
        if (m_showBottomPanel) {
            m_bottomPanel = {
                m_gameArea.left,
                m_gameArea.bottom + panelMargin,
                m_gameArea.right,
                m_gameArea.bottom + panelMargin + bottomHeight
            };
        }
        
        // Top panel - positioned above the game area
        if (m_showTopPanel) {
            m_topPanel = {
                m_gameArea.left,
                m_gameArea.top - panelMargin - topHeight,
                m_gameArea.right,
                m_gameArea.top - panelMargin
            };
        }
    } else {
        // No game area - use default layout with panels on sides
        
        // Left panel - full height on the left side
        m_leftPanel = {
            m_clientRect.left + panelMargin,
            m_clientRect.top + panelMargin,
            m_clientRect.left + leftWidth + panelMargin,
            m_clientRect.bottom - panelMargin
        };
        
        // Right panel - full height on the right side
        m_rightPanel = {
            m_clientRect.right - rightWidth - panelMargin,
            m_clientRect.top + panelMargin,
            m_clientRect.right - panelMargin,
            m_clientRect.bottom - panelMargin
        };
        
        // Calculate the center area width for proper alignment of top/bottom panels
        int centerWidth = clientWidth - leftWidth - rightWidth - (panelMargin * 4);
        
        // Bottom panel - spans between the side panels
        if (m_showBottomPanel) {
            m_bottomPanel = {
                m_clientRect.left + leftWidth + (panelMargin * 2),
                m_clientRect.bottom - bottomHeight - panelMargin,
                m_clientRect.left + leftWidth + (panelMargin * 2) + centerWidth,
                m_clientRect.bottom - panelMargin
            };
        }
        
        // Top panel - spans between the side panels
        if (m_showTopPanel) {
            m_topPanel = {
                m_clientRect.left + leftWidth + (panelMargin * 2),
                m_clientRect.top + panelMargin,
                m_clientRect.left + leftWidth + (panelMargin * 2) + centerWidth,
                m_clientRect.top + topHeight + panelMargin
            };
        }
    }
    
    // Ensure panel widths are at least minimum size
    if (m_leftPanel.right - m_leftPanel.left < 200 && m_showLeftPanel) {
        m_leftPanel.right = m_leftPanel.left + 200;
    }
    
    if (m_rightPanel.right - m_rightPanel.left < 200 && m_showRightPanel) {
        m_rightPanel.left = m_rightPanel.right - 200;
    }
}

void CoachingInterface::CreateFonts() {
    // Get system DPI for proper font scaling
    HDC hdc = GetDC(NULL);
    int dpiX = GetDeviceCaps(hdc, LOGPIXELSX);
    ReleaseDC(NULL, hdc);
    
    // Calculate font sizes based on DPI
    float dpiScale = static_cast<float>(dpiX) / 96.0f;
    
    // Scale font sizes based on DPI
    int titleSize = static_cast<int>(18 * dpiScale);
    int headerSize = static_cast<int>(16 * dpiScale);
    int normalSize = static_cast<int>(14 * dpiScale);
    int smallSize = static_cast<int>(12 * dpiScale);
    
    // Create modern font hierarchy with better typography and proper scaling
    m_theme.titleFont = CreateFont(titleSize, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
                                   DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                   CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    
    m_theme.headerFont = CreateFont(headerSize, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    
    m_theme.normalFont = CreateFont(normalSize, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    
    m_theme.smallFont = CreateFont(smallSize, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                   DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                   CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    
    m_theme.monoFont = CreateFont(smallSize, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                  DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                  CLEARTYPE_QUALITY, FIXED_PITCH | FF_MODERN, L"Consolas");
    
    // Log font creation for debugging
    std::wcout << L"Created fonts with DPI scale: " << dpiScale
              << L" (Title: " << titleSize
              << L", Normal: " << normalSize << L")" << std::endl;
}

void CoachingInterface::DestroyFonts() {
    if (m_theme.titleFont) DeleteObject(m_theme.titleFont);
    if (m_theme.headerFont) DeleteObject(m_theme.headerFont);
    if (m_theme.normalFont) DeleteObject(m_theme.normalFont);
    if (m_theme.smallFont) DeleteObject(m_theme.smallFont);
    if (m_theme.monoFont) DeleteObject(m_theme.monoFont);
}

void CoachingInterface::CreateBrushes() {
    // Create brushes with enhanced colors for better visual hierarchy
    
    // Very dark background for maximum contrast with game content
    m_backgroundBrush = CreateSolidBrush(RGB(12, 12, 14));
    
    // Dark blue-gray panels with slight transparency effect
    m_panelBrush = CreateSolidBrush(RGB(25, 25, 30));
    
    // Bright blue accent for highlights and interactive elements
    m_accentBrush = CreateSolidBrush(RGB(0, 122, 255));
    
    // Create a thicker border pen that will scale with DPI
    int borderThickness = std::max(2, GetSystemMetrics(SM_CXBORDER) * 2);
    m_borderPen = CreatePen(PS_SOLID, borderThickness, RGB(58, 58, 62));
    
    // Log brush creation for debugging
    std::wcout << L"Created brushes with border thickness: " << borderThickness << std::endl;
}

void CoachingInterface::DestroyBrushes() {
    if (m_backgroundBrush) DeleteObject(m_backgroundBrush);
    if (m_panelBrush) DeleteObject(m_panelBrush);
    if (m_accentBrush) DeleteObject(m_accentBrush);
    if (m_borderPen) DeleteObject(m_borderPen);
}

std::string CoachingInterface::FormatTime(DWORD timestamp) const {
    DWORD elapsed = (GetTickCount() - timestamp) / 1000;
    
    if (elapsed < 60) {
        return std::to_string(elapsed) + "s";
    } else if (elapsed < 3600) {
        return std::to_string(elapsed / 60) + "m";
    } else {
        return std::to_string(elapsed / 3600) + "h";
    }
}

std::string CoachingInterface::FormatNumber(float number, int decimals) const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(decimals) << number;
    return oss.str();
}

RECT CoachingInterface::InflateRect(const RECT& rect, int dx, int dy) const {
    RECT result = rect;
    result.left += dx;
    result.top += dy;
    result.right -= dx;
    result.bottom -= dy;
    return result;
}

RECT CoachingInterface::GetPanelRect(PanelType panel) const {
    switch (panel) {
        case PanelType::STATS: return m_leftPanel;
        case PanelType::COMMENTARY: return m_rightPanel;
        case PanelType::CONTROLS: return m_bottomPanel;
        case PanelType::TIPS: return m_topPanel;
        default: return {0, 0, 0, 0};
    }
}

int CoachingInterface::GetPanelWidth(PanelType panel) const {
    RECT rect = GetPanelRect(panel);
    return rect.right - rect.left;
}

int CoachingInterface::GetPanelHeight(PanelType panel) const {
    RECT rect = GetPanelRect(panel);
    return rect.bottom - rect.top;
}

void CoachingInterface::CleanupOldItems() {
    DWORD currentTime = GetTickCount();
    
    // Remove old tips (older than 30 seconds)
    m_tips.erase(
        std::remove_if(m_tips.begin(), m_tips.end(),
            [currentTime](const TipItem& tip) {
                return (currentTime - tip.showTime) > 30000;
            }),
        m_tips.end()
    );
}

void CoachingInterface::Render() {
    // Set ImGui style to match our theme
    ImGui::PushStyleColor(ImGuiCol_WindowBg, ImVec4(0.10f, 0.10f, 0.12f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_TitleBg, ImVec4(0.08f, 0.08f, 0.10f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_TitleBgActive, ImVec4(0.0f, 0.48f, 1.0f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_FrameBg, ImVec4(0.15f, 0.15f, 0.17f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_Border, ImVec4(0.23f, 0.23f, 0.24f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_Header, ImVec4(0.0f, 0.48f, 1.0f, 0.31f));
    ImGui::PushStyleColor(ImGuiCol_HeaderHovered, ImVec4(0.0f, 0.48f, 1.0f, 0.4f));
    ImGui::PushStyleColor(ImGuiCol_HeaderActive, ImVec4(0.0f, 0.48f, 1.0f, 0.5f));
    
    // Render the game window first (central element)
    RenderGameWindow();
    
    // Render dockable panels
    RenderPlayerStatsPanel();
    RenderCommentaryPanel();
    RenderTipsPanel();
    RenderControlsPanel();
    
    // Pop all style colors
    ImGui::PopStyleColor(8);
}

void CoachingInterface::RenderPlayerStatsPanel() {
    if (!m_showLeftPanel) return;
    
    // Create dockable window with proper flags
    ImGuiWindowFlags windowFlags = ImGuiWindowFlags_None;
    
    if (ImGui::Begin("Player Stats", &m_showLeftPanel, windowFlags)) {
        // Add window-specific styling
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(8, 6));
        
        if (ImGui::BeginTable("stats", 2, ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg)) {
            ImGui::TableSetupColumn("Stat", ImGuiTableColumnFlags_WidthFixed, 100.0f);
            ImGui::TableSetupColumn("Value", ImGuiTableColumnFlags_WidthStretch);
            ImGui::TableHeadersRow();

            // Characters Section
            RenderSectionHeader("CHARACTERS");
            RenderStatRow("You", "Fox");
            RenderStatRow("Opponent", "Falco");
            
            // Add spacing between sections
            ImGui::TableNextRow();
            ImGui::TableNextColumn();
            ImGui::Spacing();
            ImGui::TableNextColumn();

            // Performance Section
            RenderSectionHeader("PERFORMANCE");
            RenderStatRow("APM", "180 (Good)");
            RenderStatRow("Combos", "12");
            RenderStatRow("K/D", "3/1 (3.0)");
            RenderStatRow("Accuracy", "75%");
            RenderStatRow("Tech Rate", "85%");
            
            // Add spacing
            ImGui::TableNextRow();
            ImGui::TableNextColumn();
            ImGui::Spacing();
            ImGui::TableNextColumn();

            // Damage Section with Progress Bars
            RenderSectionHeader("DAMAGE");
            
            // Damage Dealt
            ImGui::TableNextRow();
            ImGui::TableNextColumn();
            ImGui::Text("Dealt");
            ImGui::TableNextColumn();
            ImGui::PushStyleColor(ImGuiCol_PlotHistogram, ImVec4(0.2f, 0.8f, 0.2f, 1.0f));
            ImGui::ProgressBar(0.6f, ImVec2(-1, 0), "180%");
            ImGui::PopStyleColor();
            
            // Damage Taken
            ImGui::TableNextRow();
            ImGui::TableNextColumn();
            ImGui::Text("Taken");
            ImGui::TableNextColumn();
            ImGui::PushStyleColor(ImGuiCol_PlotHistogram, ImVec4(0.8f, 0.2f, 0.2f, 1.0f));
            ImGui::ProgressBar(0.3f, ImVec2(-1, 0), "90%");
            ImGui::PopStyleColor();
            
            // Add spacing
            ImGui::TableNextRow();
            ImGui::TableNextColumn();
            ImGui::Spacing();
            ImGui::TableNextColumn();

            // Session Section
            RenderSectionHeader("SESSION");
            RenderStatRow("Games", "5");
            RenderStatRow("Wins", "4");
            RenderStatRow("Win Rate", "80%");
            RenderStatRow("Time", "15m");

            ImGui::EndTable();
        }
        
        ImGui::PopStyleVar();
    }
    ImGui::End();
}

void CoachingInterface::RenderCommentaryPanel() {
    if (!m_showRightPanel) return;
    
    ImGuiWindowFlags windowFlags = ImGuiWindowFlags_None;
    
    if (ImGui::Begin("Commentary", &m_showRightPanel, windowFlags)) {
        // Add filter buttons
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(4, 4));
        
        static bool showAll = true;
        static bool showCombos = true;
        static bool showKills = true;
        static bool showTech = true;
        static bool showEdgeguards = true;
        
        if (ImGui::Button("All")) showAll = !showAll;
        ImGui::SameLine();
        
        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(1.0f, 0.65f, 0.0f, 0.4f));
        if (ImGui::Button("Combos")) showCombos = !showCombos;
        ImGui::PopStyleColor();
        ImGui::SameLine();
        
        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(1.0f, 0.4f, 0.4f, 0.4f));
        if (ImGui::Button("Kills")) showKills = !showKills;
        ImGui::PopStyleColor();
        ImGui::SameLine();
        
        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(0.0f, 0.6f, 1.0f, 0.4f));
        if (ImGui::Button("Tech")) showTech = !showTech;
        ImGui::PopStyleColor();
        ImGui::SameLine();
        
        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(0.4f, 1.0f, 0.4f, 0.4f));
        if (ImGui::Button("Edgeguards")) showEdgeguards = !showEdgeguards;
        ImGui::PopStyleColor();
        
        ImGui::PopStyleVar();
        ImGui::Separator();
        ImGui::Spacing();
        
        // Scrollable commentary area
        if (ImGui::BeginChild("CommentaryScroll", ImVec2(0, 0), false, ImGuiWindowFlags_AlwaysVerticalScrollbar)) {
            // Display commentary items with filtering
            for (const auto& item : m_commentary) {
                // Apply filters
                bool shouldShow = showAll;
                if (!shouldShow && !item.eventType.empty()) {
                    if (item.eventType == "combo" && showCombos) shouldShow = true;
                    else if (item.eventType == "kill" && showKills) shouldShow = true;
                    else if (item.eventType == "tech" && showTech) shouldShow = true;
                    else if (item.eventType == "edgeguard" && showEdgeguards) shouldShow = true;
                }
                
                if (!shouldShow) continue;
                
                // Choose color based on event type
                ImVec4 textColor(1.0f, 1.0f, 1.0f, 1.0f); // Default white
                ImVec4 bgColor(0.2f, 0.2f, 0.25f, 0.8f); // Default background
                
                if (!item.eventType.empty()) {
                    if (item.eventType == "combo") {
                        textColor = ImVec4(1.0f, 0.65f, 0.0f, 1.0f); // Orange
                        bgColor = ImVec4(0.3f, 0.2f, 0.0f, 0.6f);
                    } else if (item.eventType == "kill") {
                        textColor = ImVec4(1.0f, 0.4f, 0.4f, 1.0f); // Red
                        bgColor = ImVec4(0.3f, 0.1f, 0.1f, 0.6f);
                    } else if (item.eventType == "tech") {
                        textColor = ImVec4(0.0f, 0.6f, 1.0f, 1.0f); // Blue
                        bgColor = ImVec4(0.0f, 0.15f, 0.3f, 0.6f);
                    } else if (item.eventType == "edgeguard") {
                        textColor = ImVec4(0.4f, 1.0f, 0.4f, 1.0f); // Green
                        bgColor = ImVec4(0.1f, 0.3f, 0.1f, 0.6f);
                    }
                }
                
                // Create a colored background for each item
                ImVec2 itemStart = ImGui::GetCursorScreenPos();
                ImVec2 itemSize = ImVec2(ImGui::GetContentRegionAvail().x, 0);
                
                // Calculate text height
                ImVec2 textStart = ImGui::GetCursorPos();
                ImGui::PushStyleColor(ImGuiCol_Text, textColor);
                ImGui::TextWrapped(item.text.c_str());
                ImGui::PopStyleColor();
                ImVec2 textEnd = ImGui::GetCursorPos();
                
                // Draw background rectangle
                itemSize.y = textEnd.y - textStart.y + 8;
                ImGui::GetWindowDrawList()->AddRectFilled(
                    itemStart,
                    ImVec2(itemStart.x + itemSize.x, itemStart.y + itemSize.y),
                    ImGui::ColorConvertFloat4ToU32(bgColor),
                    4.0f
                );
                
                // Reset cursor and draw text again (over the background)
                ImGui::SetCursorPos(ImVec2(textStart.x + 4, textStart.y + 4));
                ImGui::PushStyleColor(ImGuiCol_Text, textColor);
                ImGui::TextWrapped(item.text.c_str());
                ImGui::PopStyleColor();
                
                // Add timestamp and event type
                ImGui::SameLine(ImGui::GetWindowWidth() - 80);
                ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.7f, 0.7f, 0.7f, 1.0f));
                ImGui::Text(FormatTime(item.timestamp).c_str());
                ImGui::PopStyleColor();
                
                if (!item.eventType.empty()) {
                    ImGui::SameLine(ImGui::GetWindowWidth() - 120);
                    ImGui::PushStyleColor(ImGuiCol_Text, textColor);
                    ImGui::Text("[%s]", item.eventType.c_str());
                    ImGui::PopStyleColor();
                }
                
                ImGui::Spacing();
            }
            
            // Auto-scroll to bottom for new items
            if (ImGui::GetScrollY() >= ImGui::GetScrollMaxY()) {
                ImGui::SetScrollHereY(1.0f);
            }
        }
        ImGui::EndChild();
    }
    ImGui::End();
}

void CoachingInterface::RenderTipsPanel() {
    static bool showTipsPanel = true;
    
    ImGuiWindowFlags windowFlags = ImGuiWindowFlags_None;
    
    if (ImGui::Begin("Tips & Coaching", &showTipsPanel, windowFlags)) {
        if (!m_tips.empty()) {
            const auto& tip = m_tips.back(); // Show most recent tip
            
            // Tip header with category badge
            ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.0f, 0.6f, 1.0f, 1.0f));
            ImGui::Text(tip.title.c_str());
            ImGui::PopStyleColor();
            
            // Category badge
            if (!tip.category.empty()) {
                ImGui::SameLine(ImGui::GetWindowWidth() - 100);
                
                ImVec4 categoryColor(0.0f, 0.6f, 1.0f, 1.0f);
                if (tip.category == "movement") categoryColor = ImVec4(0.4f, 1.0f, 0.4f, 1.0f);
                else if (tip.category == "combo") categoryColor = ImVec4(1.0f, 0.65f, 0.0f, 1.0f);
                else if (tip.category == "neutral") categoryColor = ImVec4(0.7f, 0.7f, 1.0f, 1.0f);
                
                ImGui::PushStyleColor(ImGuiCol_Text, categoryColor);
                ImGui::Text("[%s]", tip.category.c_str());
                ImGui::PopStyleColor();
            }
            
            // Importance indicator
            if (tip.importance >= 4) {
                ImGui::SameLine();
                ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(1.0f, 0.4f, 0.4f, 1.0f));
                ImGui::Text("IMPORTANT");
                ImGui::PopStyleColor();
            }
            
            ImGui::Separator();
            ImGui::Spacing();
            
            // Tip description
            ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.9f, 0.9f, 0.9f, 1.0f));
            ImGui::TextWrapped(tip.description.c_str());
            ImGui::PopStyleColor();
            
            ImGui::Spacing();
            
            // Action buttons
            if (ImGui::Button("Mark as Read")) {
                // TODO: Mark tip as read
            }
            ImGui::SameLine();
            if (ImGui::Button("Dismiss")) {
                m_tips.pop_back();
            }
            ImGui::SameLine();
            if (ImGui::Button("More Tips")) {
                // TODO: Show more tips
            }
        } else {
            // Empty state
            ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
            ImGui::Text("No active tips");
            ImGui::PopStyleColor();
            
            ImGui::Spacing();
            
            if (ImGui::Button("Generate Tip")) {
                // Add a sample tip for demonstration
                TipItem newTip;
                newTip.title = "Improve Your L-Canceling";
                newTip.description = "Practice L-canceling your aerials to reduce landing lag. This will help you maintain pressure and combo more effectively.";
                newTip.category = "movement";
                newTip.importance = 4;
                newTip.isActive = true;
                newTip.showTime = GetTickCount();
                m_tips.push_back(newTip);
            }
        }
    }
    ImGui::End();
}

void CoachingInterface::RenderControlsPanel() {
    static bool showControlsPanel = false; // Hidden by default
    
    if (!showControlsPanel) return;
    
    ImGuiWindowFlags windowFlags = ImGuiWindowFlags_None;
    
    if (ImGui::Begin("Controls & Settings", &showControlsPanel, windowFlags)) {
        // Quick action buttons
        if (ImGui::Button("Reset Stats", ImVec2(100, 30))) {
            StatsData emptyStats = {};
            UpdateStats(emptyStats);
        }
        ImGui::SameLine();
        
        if (ImGui::Button("Export Data", ImVec2(100, 30))) {
            // TODO: Implement export functionality
        }
        ImGui::SameLine();
        
        if (ImGui::Button("Settings", ImVec2(100, 30))) {
            // TODO: Open settings dialog
        }
        
        ImGui::Separator();
        
        // Game state information
        ImGui::Text("Game Information:");
        ImGui::Indent();
        
        ImGui::Text("Frame: %d", m_lastGameState.frameCount);
        ImGui::Text("Status: %s", m_lastGameState.isInGame ? "In Game" : "Menu");
        
        if (m_lastGameState.activePlayerCount > 0) {
            ImGui::Text("Players: %d", m_lastGameState.activePlayerCount);
            
            for (int i = 0; i < m_lastGameState.activePlayerCount && i < 4; i++) {
                ImGui::Text("Player %d: %.1f%% damage", i + 1, m_lastGameState.players[i].damage);
            }
        }
        
        ImGui::Unindent();
        
        ImGui::Separator();
        
        // Theme controls
        ImGui::Text("Theme Settings:");
        ImGui::Indent();
        
        static int themeSelection = 0;
        const char* themes[] = { "Dark Pro", "Dark Blue", "Light", "High Contrast", "Melee Classic" };
        if (ImGui::Combo("Theme", &themeSelection, themes, IM_ARRAYSIZE(themes))) {
            // TODO: Apply theme change
        }
        
        static float uiScale = 1.0f;
        if (ImGui::SliderFloat("UI Scale", &uiScale, 0.8f, 1.5f)) {
            // TODO: Apply UI scaling
        }
        
        ImGui::Unindent();
    }
    ImGui::End();
}

void CoachingInterface::RenderGameWindow() {
    // Create a window for the game with specific styling
    ImGuiWindowFlags gameWindowFlags = 
        ImGuiWindowFlags_NoScrollbar | 
        ImGuiWindowFlags_NoCollapse;  // Keep title bar for now to help with docking
    
    // Set initial window position and size
    ImGui::SetNextWindowPos(ImVec2(400, 50), ImGuiCond_FirstUseEver);
    ImGui::SetNextWindowSize(ImVec2(960, 720), ImGuiCond_FirstUseEver);  // Standard game size
    
    // Create the game window
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 2.0f);
    ImGui::PushStyleColor(ImGuiCol_WindowBg, ImVec4(0.05f, 0.05f, 0.05f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_Border, ImVec4(0.0f, 0.48f, 1.0f, 1.0f));  // Blue border
    
    if (ImGui::Begin("Game Window", nullptr, gameWindowFlags)) {
        // For docked windows, we need to use the main viewport's platform handle
        // and calculate the position within that window
        ImGuiViewport* viewport = ImGui::GetWindowViewport();
        if (viewport && viewport->PlatformHandle) {
            HWND platformWindow = (HWND)viewport->PlatformHandle;
            
            // Get the current window position and size in screen coordinates
            ImVec2 windowPos = ImGui::GetWindowPos();
            ImVec2 windowSize = ImGui::GetWindowSize();
            ImVec2 contentMin = ImGui::GetWindowContentRegionMin();
            ImVec2 contentMax = ImGui::GetWindowContentRegionMax();
            
            // Calculate the content area position relative to the platform window
            RECT platformRect;
            GetWindowRect(platformWindow, &platformRect);
            
            // Convert screen coordinates to client coordinates of the platform window
            POINT contentTopLeft = {(LONG)(windowPos.x + contentMin.x), (LONG)(windowPos.y + contentMin.y)};
            ScreenToClient(platformWindow, &contentTopLeft);
            
            int contentWidth = (int)(contentMax.x - contentMin.x);
            int contentHeight = (int)(contentMax.y - contentMin.y);
            
            std::wcout << L"Game Window Panel Info:" << std::endl;
            std::wcout << L"  Platform Window: " << (void*)platformWindow << std::endl;
            std::wcout << L"  Content Position: (" << contentTopLeft.x << L"," << contentTopLeft.y << L")" << std::endl;
            std::wcout << L"  Content Size: " << contentWidth << L"x" << contentHeight << std::endl;
            
            // Update our container window handle and position info
            if (m_gameWindowContainer != platformWindow) {
                m_gameWindowContainer = platformWindow;
                std::wcout << L"Game window container updated: " << (void*)m_gameWindowContainer << std::endl;
                
                // Apply container window styles for proper child window clipping
                if (IsWindow(m_gameWindowContainer)) {
                    LONG style = GetWindowLong(m_gameWindowContainer, GWL_STYLE);
                    style |= WS_CLIPCHILDREN;  // Prevent child windows from drawing outside bounds
                    SetWindowLong(m_gameWindowContainer, GWL_STYLE, style);
                    
                    std::wcout << L"Applied WS_CLIPCHILDREN style to container window" << std::endl;
                }
            }
            
            // Store the content area information for the embedding process
            // We'll use this in the GameDetectionThread to position the embedded window correctly
            m_gameContentArea.left = contentTopLeft.x;
            m_gameContentArea.top = contentTopLeft.y;
            m_gameContentArea.right = contentTopLeft.x + contentWidth;
            m_gameContentArea.bottom = contentTopLeft.y + contentHeight;
            
            std::wcout << L"Updated game content area: (" << m_gameContentArea.left << L"," 
                      << m_gameContentArea.top << L") to (" << m_gameContentArea.right 
                      << L"," << m_gameContentArea.bottom << L")" << std::endl;
        }
        
        // Get the content region for the embedded game
        ImVec2 contentMin = ImGui::GetWindowContentRegionMin();
        ImVec2 contentMax = ImGui::GetWindowContentRegionMax();
        ImVec2 windowPos = ImGui::GetWindowPos();
        
        // Calculate the actual content area in screen coordinates
        ImVec2 gameAreaMin = ImVec2(windowPos.x + contentMin.x, windowPos.y + contentMin.y);
        ImVec2 gameAreaMax = ImVec2(windowPos.x + contentMax.x, windowPos.y + contentMax.y);
        
        // Get the available content size for the game window
        ImVec2 availableSize = ImGui::GetContentRegionAvail();
        
        // Show placeholder text if no game is embedded
        if (!m_gameWindowContainer || !IsWindow(m_gameWindowContainer)) {
            ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.7f, 0.7f, 0.7f, 1.0f));
            ImVec2 textSize = ImGui::CalcTextSize("Waiting for Slippi/Dolphin...");
            ImGui::SetCursorPos(ImVec2(
                (availableSize.x - textSize.x) * 0.5f,
                (availableSize.y - textSize.y) * 0.5f
            ));
            ImGui::Text("Waiting for Slippi/Dolphin...");
            
            // Add some helpful information
            ImGui::SetCursorPos(ImVec2(
                (availableSize.x - ImGui::CalcTextSize("Launch Dolphin/Slippi to embed the game window").x) * 0.5f,
                (availableSize.y - textSize.y) * 0.5f + 30
            ));
            ImGui::Text("Launch Dolphin/Slippi to embed the game window");
            
            ImGui::PopStyleColor();
        } else {
            // Game window is embedded - show minimal status and reserve space properly
            ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.0f, 1.0f, 0.0f, 0.3f));  // Semi-transparent
            ImGui::SetCursorPos(ImVec2(5, 5));  // Small corner indicator
            ImGui::Text("Embedded");
            ImGui::PopStyleColor();
        }
        
        // Reserve the full available space for the embedded game window
        // This ensures the ImGui window maintains its proper size in the docking layout
        ImGui::Dummy(availableSize);
    }
    ImGui::End();
    ImGui::PopStyleVar(2);
    ImGui::PopStyleColor(2);
}

void CoachingInterface::RenderSectionHeader(const char* label) {
    ImGui::TableNextRow();
    ImGui::TableNextColumn();
    ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.4f, 0.5f, 0.9f, 1.0f));
    ImGui::Text(label);
    ImGui::PopStyleColor();
    ImGui::TableNextColumn();
}

void CoachingInterface::RenderStatRow(const char* label, const char* value) {
    ImGui::TableNextRow();
    ImGui::TableNextColumn();
    ImGui::Text(label);
    ImGui::TableNextColumn();
    ImGui::Text(value);
}

void CoachingInterface::RenderProgressBar(float fraction, const ImVec4& color) {
    ImGui::TableNextRow();
    ImGui::TableNextColumn();
    ImGui::PushStyleColor(ImGuiCol_PlotHistogram, color);
    ImGui::ProgressBar(fraction, ImVec2(-1, 0));
    ImGui::PopStyleColor();
    ImGui::TableNextColumn();
}
