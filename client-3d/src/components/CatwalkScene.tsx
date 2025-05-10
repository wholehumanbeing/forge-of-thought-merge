import { useEffect, useState } from "react";
import ForgeScene3D from "./ForgeScene3D";
import useForgeStore from "@/store/useForgeStore";
import archetypeColors from "@/constants/archetypeColors";
import { Node, Edge } from "@/store/useForgeStore";
import IgniteFab from "./IgniteFab";
import Toolbar from "./Toolbar";
import { toast } from "react-hot-toast";

const GalaxyScene = () => {
  const { 
    archetypeSymbols, 
    nodes, 
    setNodes, 
    edges, 
    setEdges,
    selectedNodeId,
    setSelectedNodeId
  } = useForgeStore();
  const [synthesizing, setSynthesizing] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);

  useEffect(() => {
    // Only initialize nodes if none exist yet and we have archetype symbols
    if (nodes.length === 0 && archetypeSymbols.length > 0) {
      const starterNodes = archetypeSymbols.map((symbol, i) => ({
        id: crypto.randomUUID(),
        label: symbol,
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
        semantic_type: 'related_to',
        color: "#49E3F6"
      };
      
      setEdges([...edges, newEdge]);
    }
  };

  // Handle node selection
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
  };

  // Handle synthesis process
  const handleSynthesis = () => {
    if (!selectedNodeId) {
      toast.error("Select a node to synthesize");
      return;
    }
    toast("Synthesis logic for single node selection needs to be defined.");
    setSynthesizing(false);
  };

  // Handle keyboard shortcuts (e.g., Cmd+E for synthesis)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+E (Mac) or Ctrl+E (Windows)
      if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
        event.preventDefault();
        if (selectedNodeId) {
          handleSynthesis();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, handleSynthesis]);

  // Toggle controls lock state
  const handleToggleControls = () => {
    setControlsLocked(prev => !prev);
    if (!controlsLocked) {
      toast.success("Controls locked. Use WASD to move and Esc to unlock");
    }
  };

  // Handle when controls are locked
  const handleControlsLock = () => {
    setControlsLocked(true);
  };

  // Handle when controls are unlocked
  const handleControlsUnlock = () => {
    setControlsLocked(false);
  };

  return (
    <div className="w-full h-screen">
      <ForgeScene3D 
        nodes={nodes} 
        edges={edges}
        onCreateEdge={handleCreateEdge}
        onSelectNode={handleSelectNode}
        selectedNodeId={selectedNodeId}
        synthesizing={synthesizing}
        controlsLocked={controlsLocked}
        onControlsLock={handleControlsLock}
        onControlsUnlock={handleControlsUnlock}
      />
      <div className="absolute top-4 left-4 bg-forge-dark/70 p-2 rounded">
        <h2 className="text-lg text-forge-light">Forge of Thought</h2>
      </div>
      
      <Toolbar 
        controlsLocked={controlsLocked} 
        onToggleControls={handleToggleControls} 
      />
      
      {selectedNodeId && !synthesizing && !controlsLocked && (
        <IgniteFab onClick={handleSynthesis} />
      )}
    </div>
  );
};

export default GalaxyScene;
