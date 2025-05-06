
import { useEffect, useState } from "react";
import Scene3D from "./Scene3D";
import useForgeStore from "@/store/useForgeStore";
import archetypeColors from "@/constants/archetypeColors";
import { Node, Edge } from "./InstancedNodes";

const CatwalkScene = () => {
  const { archetypeSymbols } = useForgeStore();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

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

  // Handle edge creation between nodes
  const handleCreateEdge = (sourceId: string, targetId: string) => {
    // Prevent duplicate edges
    const edgeExists = edges.some(
      edge => (edge.sourceId === sourceId && edge.targetId === targetId) ||
              (edge.sourceId === targetId && edge.targetId === sourceId)
    );
    
    if (!edgeExists) {
      const newEdge = {
        id: crypto.randomUUID(),
        sourceId,
        targetId,
        color: "#49E3F6"
      };
      
      setEdges(prevEdges => [...prevEdges, newEdge]);
    }
  };

  return (
    <div className="w-full h-screen">
      <Scene3D 
        nodes={nodes} 
        edges={edges}
        onCreateEdge={handleCreateEdge}
      />
      <div className="absolute top-4 left-4 bg-forge-dark/70 p-2 rounded">
        <h2 className="text-lg text-forge-light">Forge of Thought</h2>
      </div>
    </div>
  );
};

export default CatwalkScene;
