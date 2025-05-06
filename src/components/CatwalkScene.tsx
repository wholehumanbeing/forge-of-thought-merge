
import { useEffect, useState } from "react";
import Scene3D from "./Scene3D";
import useForgeStore from "@/store/useForgeStore";
import archetypeColors from "@/constants/archetypeColors";
import { Node, Edge } from "@/store/useForgeStore";
import IgniteFab from "./IgniteFab";
import Toolbar from "./Toolbar";
import { toast } from "react-hot-toast";

const CatwalkScene = () => {
  const { archetypeSymbols, nodes, setNodes, edges, setEdges } = useForgeStore();
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);

  useEffect(() => {
    // Only initialize nodes if none exist yet and we have archetype symbols
    if (nodes.length === 0 && archetypeSymbols.length > 0) {
      const starterNodes = archetypeSymbols.map((symbol, i) => ({
        id: crypto.randomUUID(),
        type: 'concept',
        color: archetypeColors[symbol] || "#FFFFFF",
        pos: [(i - 1) * 3, 2, -8] as [number, number, number]
      }));
      
      setNodes(starterNodes);
    }
  }, [archetypeSymbols, nodes.length, setNodes]);

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
      
      setEdges([...edges, newEdge]);
    }
  };

  // Handle node selection
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeIds(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId);
      } else {
        return [...prev, nodeId];
      }
    });
  };

  // Handle synthesis process
  const handleSynthesis = () => {
    if (selectedNodeIds.length < 2) {
      toast.error("Select at least 2 nodes to synthesize");
      return;
    }

    setSynthesizing(true);

    // Step 1: Contract selected nodes (scale down)
    const contractedNodes = nodes.map(node => 
      selectedNodeIds.includes(node.id) 
        ? { ...node, scale: 0.9 }  // Scale down selected nodes
        : node
    );
    setNodes(contractedNodes);

    // Calculate midpoint of selected nodes
    const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
    const midpoint = selectedNodes.reduce(
      (acc, node) => {
        return [
          acc[0] + node.pos[0] / selectedNodes.length,
          acc[1] + node.pos[1] / selectedNodes.length,
          acc[2] + node.pos[2] / selectedNodes.length
        ] as [number, number, number];
      },
      [0, 0, 0] as [number, number, number]
    );

    // Step 2: Create rays to midpoint (after a delay)
    setTimeout(() => {
      // Create synthesis rays
      const synthesisRays = selectedNodes.map(node => ({
        id: crypto.randomUUID(),
        sourceId: node.id,
        targetId: 'midpoint',
        color: "#F3B248",
        midpoint: midpoint,
        isRay: true
      }));
      
      setEdges([...edges, ...synthesisRays]);

      // Step 3: Flash and create synthesis node after another delay
      setTimeout(() => {
        // Create synthesis node
        const newSynthesisNode = {
          id: crypto.randomUUID(),
          type: 'synthesis',
          color: "#F3B248",
          pos: midpoint,
          scale: 1.2  // Start a bit larger for effect
        };
        
        // Add the new node and reset any scaling on original nodes
        setNodes([
          ...nodes.map(node => ({ ...node, scale: 1.0 })),
          newSynthesisNode
        ]);
        
        // Step 4: Clean up rays and reset selection
        setTimeout(() => {
          // Remove synthesis rays
          setEdges(edges.filter(edge => !edge.isRay));
          
          // Deselect nodes
          setSelectedNodeIds([]);
          
          // End animation sequence
          setSynthesizing(false);
        }, 500);
      }, 140);
    }, 100);
  };

  // Handle keyboard shortcuts (e.g., Cmd+E for synthesis)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+E (Mac) or Ctrl+E (Windows)
      if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
        event.preventDefault();
        if (selectedNodeIds.length >= 2) {
          handleSynthesis();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeIds]);

  return (
    <div className="w-full h-screen">
      <Scene3D 
        nodes={nodes} 
        edges={edges}
        onCreateEdge={handleCreateEdge}
        onSelectNode={handleSelectNode}
        selectedNodeIds={selectedNodeIds}
        synthesizing={synthesizing}
      />
      <div className="absolute top-4 left-4 bg-forge-dark/70 p-2 rounded">
        <h2 className="text-lg text-forge-light">Forge of Thought</h2>
      </div>
      
      <Toolbar />
      
      {selectedNodeIds.length >= 2 && (
        <IgniteFab onClick={handleSynthesis} />
      )}
    </div>
  );
};

export default CatwalkScene;
