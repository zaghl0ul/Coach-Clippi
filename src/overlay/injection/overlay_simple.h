// Simplified Overlay Header
#pragma once

#include <windows.h>
#include <string>
#include <vector>
#include <memory>

// Message position enum
enum class MessagePosition {
    AUTO,
    TOP_LEFT,
    TOP_CENTER,
    TOP_RIGHT,
    MIDDLE_LEFT,
    MIDDLE_CENTER,
    MIDDLE_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_CENTER,
    BOTTOM_RIGHT
};

// Message category enum
enum class MessageCategory {
    GENERAL,
    TECHNICAL,
    POSITIONING,
    COMBO,
    DEFENSIVE,
    OFFENSIVE,
    NEUTRAL
};

// Message priority enum
enum class MessagePriority {
    LOW,
    NORMAL,
    HIGH,
    CRITICAL
};

// Overlay theme enum
enum class OverlayTheme {
    LIGHT,
    DARK,
    CUSTOM
};

// Overlay position enum
enum class OverlayPosition {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT
};

// Overlay message structure
struct OverlayMessage {
    std::string text;
    int duration;
    MessagePosition position;
    MessageCategory category;
    MessagePriority priority;
};

// Overlay configuration
struct OverlayConfig {
    float transparency;
    OverlayTheme theme;
    int displayDuration;
    int fontSize;
    OverlayPosition position;
};

// Main overlay renderer class
class OverlayRenderer {
public:
    OverlayRenderer() : m_enabled(false) {}
    ~OverlayRenderer() {}

    void Initialize();
    void Shutdown();
    
    void LoadConfiguration();
    void SaveConfiguration();
    
    void ProcessMessage(const std::string& message);
    
    bool IsEnabled() const;
    void SetEnabled(bool enabled);
    
    void SetTransparency(float transparency);
    void SetTheme(OverlayTheme theme);
    void SetDisplayDuration(int milliseconds);

private:
    bool m_enabled;
    OverlayConfig m_config;
};
