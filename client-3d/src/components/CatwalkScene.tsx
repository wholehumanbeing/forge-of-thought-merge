import { useEffect, useState } from "react";
import ForgeScene3D from "./ForgeScene3D";
import useForgeStore from "@/store/useForgeStore";
import archetypeColors from "@/constants/archetypeColors";
import { Node } from "@/types/graph";
import IgniteFab from "./IgniteFab";
import Toolbar from "./Toolbar";
import { toast } from "react-hot-toast";
import { archetypeStarterNodes } from "@/constants/archetypeStarterNodes";

// Attempt to import seed data.
// IMPORTANT: This path assumes seed_concepts_llm_generated.json has been copied to client-3d/src/data/
// If this file is served via an API, this import needs to be replaced with an API call.
// You may need to create the 'data' directory: client-3d/src/data/
import seedConceptsData from "@/data/seed_concepts_llm_generated.json";

// Define the structure of objects within the seed_concepts_llm_generated.json array
interface RawSeedConceptProperties {
  name: string;
  description: string;
  domain?: string; // Optional based on your JSON structure
}

interface SeedRelationship {
  target_id: string;
  type: string;
  properties?: Record<string, unknown>; // Changed from any to unknown for better type safety
}

interface RawSeedConcept {
  id: string;
  type: string;
  properties: RawSeedConceptProperties;
  relationships?: SeedRelationship[]; 
}

const GalaxyScene = () => {
  const { 
    archetypeSymbols,
    nodes, 
    addNode,
    edges, 
    selectedNodeId,
    setSelectedNodeId,
    currentUserArchetype
  } = useForgeStore();
  const [synthesizing, setSynthesizing] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);

  useEffect(() => {
    const allSeedConcepts = seedConceptsData as RawSeedConcept[];

    if (currentUserArchetype && addNode && nodes && nodes.length === 0) {
      toast.success(`Welcome ${currentUserArchetype} to the Forge of Thought!`, { duration: 5000 });

      const starterNodesDetails = archetypeStarterNodes[currentUserArchetype];

      if (starterNodesDetails) {
        const nodesToCreate = [
          { name: starterNodesDetails.concept, type: "CONCEPT" },
          { name: starterNodesDetails.symbol, type: "SYMBOL" },
          { name: starterNodesDetails.thinker, type: "THINKER" },
        ];

        nodesToCreate.forEach((nodeDetail, i) => {
          const seedConcept = allSeedConcepts.find(
            (sc) => sc.properties.name === nodeDetail.name && sc.type.toUpperCase() === nodeDetail.type.toUpperCase()
          );

          if (seedConcept) {
            const newNode: Node = {
              id: crypto.randomUUID(),
              label: seedConcept.properties.name,
              type: seedConcept.type, // Use the type from seed data (e.g., "CONCEPT", "SYMBOL")
              color: archetypeColors[archetypeSymbols[0]] || "#CCCCCC", // Or a more specific color logic
              position: [
                (i - 1) * 6, // Spread out: e.g., -6, 0, 6 on X
                Math.random() * 2 - 1, // Slight Y variation
                -10 + i * 1 // Stagger depth slightly
              ] as [number, number, number],
              data: {
                description: seedConcept.properties.description,
                sourceConceptId: seedConcept.id,
              },
            };
            addNode(newNode);
          } else {
            console.warn(
              `Seed concept not found for ${nodeDetail.type}: ${nodeDetail.name} for archetype ${currentUserArchetype}`
            );
            // Optional: Create a fallback node if a seed concept isn't found
            const fallbackNode: Node = {
              id: crypto.randomUUID(),
              label: nodeDetail.name, // Use the name from starterNodesDetails
              type: nodeDetail.type.toLowerCase(), // fallback type
              color: "#FF0000", // Red to indicate missing
              position: [
                (i - 1) * 6, 
                Math.random() * 2 - 1, 
                -10 + i * 1
              ] as [number, number, number],
              data: {
                description: `Fallback node: ${nodeDetail.type} - ${nodeDetail.name} (seed data missing)`, 
                sourceConceptId: null 
              }
            };
            addNode(fallbackNode);
          }
        });
      } else {
        console.warn(`No starter node details found for archetype: ${currentUserArchetype}`);
        // Fallback for when archetype has no defined starter nodes (should not happen with full data)
        // You might want to add some generic nodes here or show an error
      }
    }
  }, [currentUserArchetype, nodes, addNode, archetypeSymbols]);

  // Handle edge creation between nodes
  const handleCreateEdge = (sourceNodeId: string, targetNodeId: string) => {
    // Prevent duplicate edges
    const edgeExists = (edges ?? []).some(
      edge => (edge.source === sourceNodeId && edge.target === targetNodeId) ||
              (edge.source === targetNodeId && edge.target === sourceNodeId)
    );
    
    if (!edgeExists) {
      const newEdge = {
        id: crypto.randomUUID(),
        source: sourceNodeId, // Changed sourceId to source
        target: targetNodeId, // Changed targetId to target
        semantic_type: 'related_to', // Ensure your Edge type in store/types supports this
        label: 'related',
        color: "#49E3F6"
      };
      // useForgeStore's addEdge will generate ID if not provided and handle semantic_type/label defaults
      // The setEdges below should be replaced with addEdge from the store
      // setEdges([...(edges ?? []), newEdge]); // Old way
      useForgeStore.getState().addEdge(newEdge); // Correct way to add an edge via store action
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
