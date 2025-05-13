// Mapping from sorted, hyphen-joined symbol triplets to archetype names
const archetypeTripletToName: Record<string, string> = {
  "gold-mercury-silver": "The Auric Messenger",
  "Lunar-Mercurial-Jovian": "The Moonlit Sage",
  "Lunar-Mercurial-Martial": "The Nightblade",
  "Lunar-Mercurial-Saline": "The Reflective Chalice",
  "Lunar-Mercurial-Saturnine": "The Shadow Scholar",
  "Lunar-Mercurial-Sulfuric": "The Mystic Crucible",
  "Lunar-Venusian-Jovian": "The Nurturing Oracle",
  "Lunar-Venusian-Martial": "The Devoted Protector",
  "Lunar-Venusian-Saline": "The Gentle Vessel",
  "Lunar-Venusian-Saturnine": "The Melancholic Lover",
  "Lunar-Venusian-Sulfuric": "The Passionate Dreamer",
  "Lunar-Jovian-Martial": "The Visionary Defender",
  "Lunar-Jovian-Saline": "The Keeper of Tides",
  "Lunar-Jovian-Saturnine": "The Hermit Prophet",
  "Lunar-Jovian-Sulfuric": "The Lunar Alchemist",
  "Lunar-Martial-Saline": "The Midnight Guardian",
  "Lunar-Martial-Saturnine": "The Silent Sentinel",
  "Lunar-Martial-Sulfuric": "The Witchblade",
  "Lunar-Saline-Saturnine": "The Moonlit Anchor",
  "Lunar-Saline-Sulfuric": "The Dream Vessel",
  "Lunar-Saturnine-Sulfuric": "The Dark Crucible",
  "Martial-Jovian-Saline": "The Defender of Order",
  "Martial-Jovian-Saturnine": "The Just Warrior",
  "Martial-Jovian-Sulfuric": "The Zealous Crusader",
  "Martial-Saline-Saturnine": "The Stoic Guardian",
  "Martial-Saline-Sulfuric": "The Blooded Vessel",
  "Martial-Saturnine-Sulfuric": "The Iron Crucible",
  "Mercurial-Jovian-Saline": "The Keeper of Lore",
  "Mercurial-Jovian-Saturnine": "The Wise Architect",
  "Mercurial-Jovian-Sulfuric": "The Visionary Alchemist",
  "Mercurial-Martial-Jovian": "The Tactical Herald",
  "Mercurial-Martial-Saline": "The Protean Guard",
  "Mercurial-Martial-Saturnine": "The Iron Messenger",
  "Mercurial-Martial-Sulfuric": "The Fiery Magus",
  "Mercurial-Saline-Saturnine": "The Silent Scribe",
  "Mercurial-Saline-Sulfuric": "The Living Talisman",
  "Mercurial-Saturnine-Sulfuric": "The Secret Fire",
  "Mercurial-Venusian-Jovian": "The Diplomatic Sage",
  "Mercurial-Venusian-Martial": "The Charming Duelist",
  "Mercurial-Venusian-Saline": "The Artful Vessel",
  "Mercurial-Venusian-Saturnine": "The Cunning Mediator",
  "Mercurial-Venusian-Sulfuric": "The Creative Trickster",
  "Saturnine-Saline-Sulfuric": "The Crucible Stone",
  "Solar-Jovian-Martial": "The Conquering Visionary",
  "Solar-Jovian-Saline": "The Steward of Plenty",
  "Solar-Jovian-Saturnine": "The Judicious Patriarch",
  "Solar-Jovian-Sulfuric": "The Prophetic Flame",
  "Solar-Lunar-Jovian": "The Enlightened Monarch",
  "Solar-Lunar-Martial": "The Sunlit Warrior",
  "Solar-Lunar-Mercurial": "The Philosopher‑King",
  "Solar-Lunar-Saline": "The Illuminated Vessel",
  "Solar-Lunar-Saturnine": "The Stoic Luminary",
  "Solar-Lunar-Sulfuric": "The Golden Alchemist",
  "Solar-Lunar-Venusian": "The Radiant Consort",
  "Solar-Martial-Jovian": "The Conquering Visionary",
  "Solar-Martial-Saline": "The Guardian of Light",
  "Solar-Martial-Saturnine": "The Iron Sovereign",
  "Solar-Martial-Sulfuric": "The Fiery Crusader",
  "Solar-Mercurial-Jovian": "The Visionary Herald",
  "Solar-Mercurial-Martial": "The Brilliant Strategist",
  "Solar-Mercurial-Saline": "The Luminous Scribe",
  "Solar-Mercurial-Saturnine": "The Disciplined Magician",
  "Solar-Mercurial-Sulfuric": "The Radiant Transmuter",
  "Solar-Mercurial-Venusian": "The Charismatic Magus",
  "Solar-Saline-Saturnine": "The Resolute Pillar",
  "Solar-Saline-Sulfuric": "The Embodied Fire",
  "Solar-Saturnine-Sulfuric": "The Purifying Sun",
  "Solar-Venusian-Jovian": "The Benevolent Ruler",
  "Solar-Venusian-Martial": "The Passionate Hero",
  "Solar-Venusian-Saline": "The Loving Chalice",
  "Solar-Venusian-Saturnine": "The Tempered Lover",
  "Solar-Venusian-Sulfuric": "The Creative Catalyst",
  "Venusian-Jovian-Martial": "The Crusading Lover",
  "Venusian-Jovian-Saline": "The Harvest Maiden",
  "Venusian-Jovian-Saturnine": "The Gracious Matriarch",
  "Venusian-Jovian-Sulfuric": "The Blooming Oracle",
  "Venusian-Martial-Saline": "The Heartbound Shield",
  "Venusian-Martial-Saturnine": "The Loyal Commander",
  "Venusian-Martial-Sulfuric": "The Passion Spark",
  "Venusian-Saline-Saturnine": "The Enduring Heart",
  "Venusian-Saline-Sulfuric": "The Embodied Grace",
  "Venusian-Saturnine-Sulfuric": "The Tempered Flame",
  "Jovian-Saline-Saturnine": "The Pillar of Wisdom",
  "Jovian-Saline-Sulfuric": "The Sacred Fountain",
  "Jovian-Saturnine-Sulfuric": "The Alchemical Judge"
};

// Map modern element names to traditional alchemical symbols
const elementToSymbol: Record<string, string> = {
  "gold": "Solar",
  "silver": "Lunar",
  "mercury": "Mercurial",
  "copper": "Venusian", 
  "iron": "Martial",
  "tin": "Jovian",
  "lead": "Saturnine",
  "sulfur": "Sulfuric",
  "salt": "Saline"
};

/**
 * Given an array of three archetype symbols, returns the archetype name.
 * The order of the symbols does not matter.
 */
export function getArchetypeName(symbols: string[]): string | undefined {
  if (!symbols || symbols.length !== 3) return undefined;
  
  // First try modern elements directly (including our manually added ones)
  const modernKey = [...symbols].sort().join("-");
  if (modernElementsToArchetype[modernKey]) {
    return modernElementsToArchetype[modernKey];
  }
  
  // As fallback, convert modern element names to traditional symbols
  const traditionalSymbols = symbols.map(symbol => elementToSymbol[symbol] || symbol);
  
  // Create key by sorting and joining
  const traditionalKey = [...traditionalSymbols].sort().join("-");
  return archetypeTripletToName[traditionalKey];
}

// Also add direct mappings for modern element combinations for backward compatibility
const modernElementsToArchetype: Record<string, string> = {
  // Add specific mapping for gold-iron-salt which was in the error message
  "gold-iron-salt": "The Guardian of Light"
};

// Generate all modern element combinations by converting from the traditional ones
Object.keys(archetypeTripletToName).forEach(traditionalKey => {
  const traditionalSymbols = traditionalKey.split("-");
  const modernSymbols = traditionalSymbols.map(symbol => {
    // Find the modern element that maps to this traditional symbol
    for (const [modern, traditional] of Object.entries(elementToSymbol)) {
      if (traditional === symbol) {
        return modern;
      }
    }
    return symbol; // fallback
  });
  
  const modernKey = [...modernSymbols].sort().join("-");
  modernElementsToArchetype[modernKey] = archetypeTripletToName[traditionalKey];
});

// Add both to exports
export { archetypeTripletToName, elementToSymbol, modernElementsToArchetype };

export default archetypeTripletToName; 