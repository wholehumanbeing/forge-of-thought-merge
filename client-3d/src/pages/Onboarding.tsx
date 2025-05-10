import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useForgeStore from "@/store/useForgeStore";

// Import alchemical symbols
import goldSymbol from "@/assets/symbols/gold.svg";
import silverSymbol from "@/assets/symbols/silver.svg";
import mercurySymbol from "@/assets/symbols/mercury.svg";
import copperSymbol from "@/assets/symbols/copper.svg";
import ironSymbol from "@/assets/symbols/iron.svg";
import tinSymbol from "@/assets/symbols/tin.svg";
import leadSymbol from "@/assets/symbols/lead.svg";
import sulfurSymbol from "@/assets/symbols/sulfur.svg";
import saltSymbol from "@/assets/symbols/salt.svg";

type SymbolType = {
  id: string;
  name: string;
  src: string;
};

const alchemicalSymbols: SymbolType[] = [
  { id: "gold", name: "Gold", src: goldSymbol },
  { id: "silver", name: "Silver", src: silverSymbol },
  { id: "mercury", name: "Mercury", src: mercurySymbol },
  { id: "copper", name: "Copper", src: copperSymbol },
  { id: "iron", name: "Iron", src: ironSymbol },
  { id: "tin", name: "Tin", src: tinSymbol },
  { id: "lead", name: "Lead", src: leadSymbol },
  { id: "sulfur", name: "Sulfur", src: sulfurSymbol },
  { id: "salt", name: "Salt", src: saltSymbol },
];

const Onboarding = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const navigate = useNavigate();
  const { setArchetypesFromSymbols } = useForgeStore();

  const handleSymbolClick = (symbolId: string) => {
    setSelectedSymbols((prev) => {
      if (prev.includes(symbolId)) {
        // Remove if already selected
        return prev.filter((id) => id !== symbolId);
      } else {
        // Add if less than 3 are selected
        if (prev.length < 3) {
          return [...prev, symbolId];
        }
        return prev;
      }
    });
  };

  const handleSubmit = () => {
    // Call the setArchetypesFromSymbols method from the store
    setArchetypesFromSymbols(selectedSymbols);
    // Navigate to galaxy view
    navigate("/galaxy");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-forge-primary to-forge-accent">
        Select Your Alchemical Symbols
      </h1>
      <p className="text-lg md:text-xl mb-8 text-center max-w-md">
        Choose exactly three symbols that resonate with you
      </p>
      
      {/* 3x3 Grid of Alchemical Symbols */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg">
        {alchemicalSymbols.map((symbol) => (
          <div 
            key={symbol.id}
            className={`
              flex flex-col items-center justify-center cursor-pointer p-4 rounded-lg 
              transition-all duration-300 hover:bg-forge-dark/50
              ${selectedSymbols.includes(symbol.id) ? 'ring-2 ring-forge-accent bg-forge-dark/30' : ''}
            `}
            onClick={() => handleSymbolClick(symbol.id)}
          >
            <img 
              src={symbol.src} 
              alt={symbol.name} 
              className="w-16 h-16 md:w-20 md:h-20 text-white mb-2" 
            />
            <span className="text-sm text-forge-light">{symbol.name}</span>
          </div>
        ))}
      </div>
      
      <Button 
        onClick={handleSubmit}
        disabled={selectedSymbols.length !== 3}
        className="bg-forge-primary hover:bg-forge-accent text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
      >
        Continue
      </Button>
      <p className="text-sm mt-4 text-forge-light">
        {selectedSymbols.length}/3 symbols selected
      </p>
    </div>
  );
};

export default Onboarding;
