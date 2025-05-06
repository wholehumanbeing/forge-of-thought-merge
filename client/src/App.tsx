import React, { useState } from 'react'; // Import useState
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout'; // We'll create this
import CanvasPage from './pages/CanvasPage'; // We'll create this
import { ArchetypeSelector } from './components/onboarding/ArchetypeSelector'; // Use named import
import { selectArchetype } from './services/api'; // Corrected import path
import useCanvasStore from './store/canvasStore'; // Import the Zustand store
import { logger } from './utils/logger'; // Import the logger
import './index.css'; // Assuming Tailwind is imported here
import { ReactFlowProvider, Node } from 'reactflow';
import { KnowledgeNodeData, NodeType } from './types/api';
import { Archetype } from './constants/archetypes';

// Interface matching the data structure from the backend API
// Removed ApiSeedConcept definition from here

// Validation function for seed nodes (accepts potentially partial ReactFlow nodes)
const isValidSeedNode = (node: Partial<Node<KnowledgeNodeData>>): node is Node<KnowledgeNodeData> => {
  console.log('[DEBUG] Validating seed node:', node);
  
  const valid = (
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
  
  if (!valid) {
    console.log('[DEBUG] Node validation failed. Issues:');
    if (!node) console.log('- Node is null or undefined');
    else {
      if (typeof node.id !== 'string' || node.id.trim() === '') 
        console.log('- Invalid ID:', node.id);
      if (typeof node.position !== 'object' || node.position === null)
        console.log('- Invalid position object');
      else if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number')
        console.log('- Invalid position coordinates:', node.position);
      if (typeof node.data !== 'object' || node.data === null)
        console.log('- Invalid data object');
      else {
        if (typeof node.data.label !== 'string' || node.data.label.trim() === '')
          console.log('- Invalid label:', node.data.label);
        if (!Object.values(NodeType).includes(node.data.type as NodeType))
          console.log('- Invalid node type:', node.data.type, 'Valid types:', Object.values(NodeType));
      }
      if (node.type !== 'knowledgeNode')
        console.log('- Invalid React Flow node type:', node.type);
    }
  }
  
  return valid;
};

function App() {
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true); // Add state for onboarding
  const addSeedNodes = useCanvasStore((state) => state.addSeedNodes); // Use correct method from store

  const handleArchetypeSelected = async (archetype: Archetype) => {
    logger.info('Archetype selected:', archetype.name);
    console.log('[DEBUG] Handling archetype selection:', archetype);
    
    try {
      // selectArchetype now returns Node<KnowledgeNodeData>[] directly
      const seedNodes: Node<KnowledgeNodeData>[] = await selectArchetype(archetype.id);
      logger.debug('Received seed nodes from API wrapper:', seedNodes);
      console.log('[DEBUG] Raw seed nodes received:', JSON.stringify(seedNodes));

      // Basic validation (is it an array?)
      if (!Array.isArray(seedNodes)) {
        // This case should technically be handled by the API wrapper's error handling
        console.error('[DEBUG] API wrapper did not return an array:', seedNodes);
        throw new Error('API wrapper did not return an array of seed nodes.');
      }

      // No transformation needed here as the type matches Node<KnowledgeNodeData>[]

      // Validate the received nodes using the updated validator
      const validatedSeedNodes = seedNodes.filter(isValidSeedNode);
      console.log('[DEBUG] Validated seed nodes:', validatedSeedNodes);

      if (validatedSeedNodes.length !== seedNodes.length) {
        logger.warn('Some seed nodes received were invalid and have been filtered out.', {
          totalReceived: seedNodes.length,
          validCount: validatedSeedNodes.length,
          invalidNodes: seedNodes.filter(node => !isValidSeedNode(node))
        });
        console.warn('[DEBUG] Invalid nodes filtered out:', 
          seedNodes.filter(node => !isValidSeedNode(node)));
      }

      if (validatedSeedNodes.length === 0 && seedNodes.length > 0) {
          console.error('[DEBUG] All seed nodes were invalid');
          throw new Error('All seed nodes received from the API were invalid.');
      }

      logger.info(`Setting ${validatedSeedNodes.length} valid seed nodes for archetype: ${archetype.name}.`);
      console.log(`[DEBUG] Adding ${validatedSeedNodes.length} seed nodes to store`);
      addSeedNodes(validatedSeedNodes);
      setIsOnboarding(false);
    } catch (error) {
      logger.error(`Failed to select archetype '${archetype.name}' or set seed nodes:`, error);
      console.error('[DEBUG] Error in handleArchetypeSelected:', error);
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
