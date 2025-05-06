
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useForgeStore from "@/store/useForgeStore";
import sunSymbol from "@/assets/symbols/sun.svg";
import moonSymbol from "@/assets/symbols/moon.svg";
import mercurySymbol from "@/assets/symbols/mercury.svg";
import venusSymbol from "@/assets/symbols/venus.svg";
import marsSymbol from "@/assets/symbols/mars.svg";
import jupiterSymbol from "@/assets/symbols/jupiter.svg";
import saturnSymbol from "@/assets/symbols/saturn.svg";
import uranusSymbol from "@/assets/symbols/uranus.svg";
import neptuneSymbol from "@/assets/symbols/neptune.svg";
import plutoSymbol from "@/assets/symbols/pluto.svg";
import fireSymbol from "@/assets/symbols/fire.svg";
import waterSymbol from "@/assets/symbols/water.svg";

type SymbolType = {
  id: string;
  name: string;
  src: string;
};

const symbols: SymbolType[] = [
  { id: "sun", name: "Sun", src: sunSymbol },
  { id: "moon", name: "Moon", src: moonSymbol },
  { id: "mercury", name: "Mercury", src: mercurySymbol },
  { id: "venus", name: "Venus", src: venusSymbol },
  { id: "mars", name: "Mars", src: marsSymbol },
  { id: "jupiter", name: "Jupiter", src: jupiterSymbol },
  { id: "saturn", name: "Saturn", src: saturnSymbol },
  { id: "uranus", name: "Uranus", src: uranusSymbol },
  { id: "neptune", name: "Neptune", src: neptuneSymbol },
  { id: "pluto", name: "Pluto", src: plutoSymbol },
  { id: "fire", name: "Fire", src: fireSymbol },
  { id: "water", name: "Water", src: waterSymbol },
];

const Onboarding = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const navigate = useNavigate();
  const { setArchetypeSymbols } = useForgeStore();

  const handleSymbolClick = (symbolId: string) => {
    setSelectedSymbols((prev) => {
      if (prev.includes(symbolId)) {
        return prev.filter((id) => id !== symbolId);
      } else {
        if (prev.length < 3) {
          return [...prev, symbolId];
        }
        return prev;
      }
    });
  };

  const handleContinue = () => {
    setArchetypeSymbols(selectedSymbols);
    navigate("/play");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-forge-primary to-forge-accent">
        Choose Your Archetypes
      </h1>
      <p className="text-lg md:text-xl mb-8 text-center max-w-md">
        Select three symbols that resonate with your consciousness
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8 max-w-4xl">
        {symbols.map((symbol) => (
          <div 
            key={symbol.id}
            className={`
              flex flex-col items-center cursor-pointer p-4 rounded-lg 
              transition-all duration-300 hover:bg-forge-dark/50
              ${selectedSymbols.includes(symbol.id) ? 'ring-plasma ring-4' : ''}
            `}
            onClick={() => handleSymbolClick(symbol.id)}
          >
            <img 
              src={symbol.src} 
              alt={symbol.name} 
              className="w-16 h-16 md:w-20 md:h-20 text-white" 
            />
            <span className="mt-2 text-sm">{symbol.name}</span>
          </div>
        ))}
      </div>
      
      <Button 
        onClick={handleContinue}
        disabled={selectedSymbols.length !== 3}
        className="bg-forge-primary hover:bg-forge-accent text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
      >
        Enter the Ritual Ground
      </Button>
      <p className="text-sm mt-4 text-gray-400">
        {selectedSymbols.length}/3 archetypes selected
      </p>
    </div>
  );
};

export default Onboarding;
