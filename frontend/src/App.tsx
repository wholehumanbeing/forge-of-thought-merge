import React, { useState } from 'react'; // Import useState
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout'; // We'll create this
import CanvasPage from './pages/CanvasPage'; // We'll create this
import { ArchetypeSelector } from './components/onboarding/ArchetypeSelector'; // Use named import
import { selectArchetype } from './services/api'; // Corrected import path
import useCanvasStore from './store/canvasStore'; // Import the Zustand store
import logger from './utils/logger'; // Import the logger
import './index.css'; // Assuming Tailwind is imported here
import { ReactFlowProvider, Node } from 'reactflow';
import { KnowledgeNodeData, NodeType } from './types/api';
import { Archetype } from './constants/archetypes';

// Interface matching the data structure from the backend API
// Removed ApiSeedConcept definition from here

// Validation function for seed nodes (accepts potentially partial ReactFlow nodes)
const isValidSeedNode = (node: Partial<Node<KnowledgeNodeData>>): node is Node<KnowledgeNodeData> => {
  return (
    !!node &&
    typeof node.id === 'string' && node.id.trim() !== '' &&
    typeof node.position === 'object' && node.position !== null &&
    typeof node.position.x === 'number' && typeof node.position.y === 'number' &&
    typeof node.data === 'object' && node.data !== null &&
    typeof node.data.label === 'string' && node.data.label.trim() !== '' &&
    Object.values(NodeType).includes(node.data.type as NodeType) && // Check if type is a valid NodeType
    // Validate other required KnowledgeNodeData fields if necessary
    node.type === 'knowledgeNode' // Ensure the React Flow node type is correct
  );
};

function App() {
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true); // Add state for onboarding
  const addSeedNodes = useCanvasStore((state) => state.addSeedNodes); // Use correct method from store

  const handleArchetypeSelected = async (archetype: Archetype) => {
    logger.info('Archetype selected:', archetype.name);
    try {
      // selectArchetype now returns Node<KnowledgeNodeData>[] directly
      const seedNodes: Node<KnowledgeNodeData>[] = await selectArchetype(archetype.id);
      logger.debug('Received seed nodes from API wrapper:', seedNodes);

      // Basic validation (is it an array?)
      if (!Array.isArray(seedNodes)) {
        // This case should technically be handled by the API wrapper's error handling
        throw new Error('API wrapper did not return an array of seed nodes.');
      }

      // No transformation needed here as the type matches Node<KnowledgeNodeData>[]

      // Validate the received nodes using the updated validator
      const validatedSeedNodes = seedNodes.filter(isValidSeedNode);

      if (validatedSeedNodes.length !== seedNodes.length) {
        logger.warn('Some seed nodes received were invalid and have been filtered out.', {
          totalReceived: seedNodes.length,
          validCount: validatedSeedNodes.length,
          invalidNodes: seedNodes.filter(node => !isValidSeedNode(node))
        });
      }

      if (validatedSeedNodes.length === 0 && seedNodes.length > 0) {
          throw new Error('All seed nodes received from the API were invalid.');
      }

      logger.info(`Setting ${validatedSeedNodes.length} valid seed nodes for archetype: ${archetype.name}.`);
      addSeedNodes(validatedSeedNodes);
      setIsOnboarding(false);
    } catch (error) {
      logger.error(`Failed to select archetype '${archetype.name}' or set seed nodes:`, error);
      // Show user-friendly error message
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Conditional Rendering based on onboarding state */}
          <Route index element={
            isOnboarding
              ? <ArchetypeSelector onArchetypeSelected={handleArchetypeSelected} />
              : <ReactFlowProvider>
                  <CanvasPage />
                </ReactFlowProvider>
          } />
          {/* Add other routes here if needed */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
