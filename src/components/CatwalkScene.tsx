
import { useEffect, useState } from "react";
import Scene3D from "./Scene3D";
import useForgeStore from "@/store/useForgeStore";
import archetypeColors from "@/constants/archetypeColors";
import { Node } from "./InstancedNodes";

const CatwalkScene = () => {
  const { archetypeSymbols } = useForgeStore();
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    // Initialize nodes based on selected archetype symbols
    const starterNodes = archetypeSymbols.map((symbol, i) => ({
      id: crypto.randomUUID(),
      type: 'concept',
      color: archetypeColors[symbol] || "#FFFFFF",
      pos: [(i - 1) * 3, 2, -8] as [number, number, number]
    }));
    
    setNodes(starterNodes);
  }, [archetypeSymbols]);

  return (
    <div className="w-full h-screen">
      <Scene3D nodes={nodes} />
      <div className="absolute top-4 left-4 bg-forge-dark/70 p-2 rounded">
        <h2 className="text-lg text-forge-light">Forge of Thought</h2>
      </div>
    </div>
  );
};

export default CatwalkScene;
