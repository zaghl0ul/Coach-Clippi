// src/templateCoachingSystem.js
export function generateFallbackCoaching(matchData) {
  if (!matchData || !matchData.characters) {
    return "Unable to generate coaching advice: insufficient data";
  }

  // Extract basic info
  const characters = matchData.characters || [];
  const damage = matchData.damageDealt || [];
  const stocks = matchData.stockLosses || [];

  // Build simple coaching message
  let advice = "# Quick Coaching Analysis\n\n";

  // Add player sections
  characters.forEach((character, index) => {
    // Skip detailed advice for CPU players if detected
    const playerType = matchData.playerTypes?.[index] || 0;
    const isCPU = playerType === 1;
    
    if (isCPU) {
      advice += `## Player ${index + 1} (${character} CPU)\n`;
      advice += "CPU performance analysis skipped.\n\n";
      return;
    }
    
    advice += `## Player ${index + 1} (${character})\n`;
    
    // Calculate efficiency
    const stocksLost = stocks[index] || 0;
    const damageDealt = damage[index] || 0;
    const efficiency = stocksLost > 0 ? damageDealt / stocksLost : damageDealt;
    
    // Rate performance
    let rating = "average";
    if (efficiency > 150) rating = "excellent";
    else if (efficiency > 100) rating = "good";
    else if (efficiency < 50) rating = "needs improvement";
    
    advice += `Overall performance: ${rating.toUpperCase()}\n`;
    advice += `Damage per stock: ${efficiency.toFixed(1)}\n\n`;
    
    // Add character-specific tips
    advice += "### Key improvements:\n";
    
    switch(character) {
      case "Fox":
        advice += "- Practice shine OoS and upthrow upair conversions\n";
        advice += "- Improve recovery mixups with shortened side-B\n";
        break;
      case "Falco":
        advice += "- Focus on laser height mixups and pillar combos\n";
        advice += "- Work on ledgedash timing for better invincibility\n";
        break;
      case "Marth":
        advice += "- Practice dash dance grab conversions\n";
        advice += "- Improve tipper spacing at kill percent ranges\n";
        break;
      default:
        advice += "- Practice character-specific combo extensions\n";
        advice += "- Improve neutral positioning and movement\n";
    }
    
    advice += "\n";
  });
  
  // Add quick match note if multiple characters
  if (characters.length >= 2) {
    advice += `## Matchup Note: ${characters[0]} vs ${characters[1]}\n`;
    advice += "Focus on improving your neutral game opening frequency and optimizing punishes.\n";
  }
  
  return advice;
}

export default { generateFallbackCoaching };