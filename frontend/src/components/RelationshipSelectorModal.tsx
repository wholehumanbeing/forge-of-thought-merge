import React, { useState, useCallback } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { useCanvasStore } from '../store/canvasStore'; // Adjusted path
import { SemanticEdgeType, ALCHEMICAL_EDGES, AlchemicalEdge } from '../constants/semanticRelationships';
// import { shallow } from 'zustand/shallow'; // Probably not needed with direct selection, but keep in mind

// Style constant likely remains the same
const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 420,
  maxHeight: '80vh',
  overflowY: 'auto',
  bgcolor: 'background.default',
  borderRadius: 3,
  boxShadow: 8,
  p: 3,
} as const;

const RelationshipSelectorModal: React.FC = () => {
  // --- START REPLACEMENT CODE ---
  // Select state pieces and actions directly.
  const pendingConnectionParams = useCanvasStore(state => state.pendingConnectionParams);
  const confirmRelationshipSelection = useCanvasStore(state => state.confirmRelationshipSelection);
  const setPendingConnection = useCanvasStore(state => state.setPendingConnection); // Get the action directly
  const nodes = useCanvasStore(state => state.nodes); // Get nodes to find labels

  // Derived state: Is the modal open?
  const isOpen = !!pendingConnectionParams;

  // Local state for the selected relationship type
  const [selectedType, setSelectedType] = useState<SemanticEdgeType | null>(null);

  // Stable close handler using the directly selected action
  const handleClose = useCallback(() => {
    setPendingConnection(null); // Call the stable action from the store
    setSelectedType(null); // Reset local state
  }, [setPendingConnection]); // Dependency is stable

  // Handle selection and confirmation
  const handleSelect = useCallback((type: SemanticEdgeType) => {
    setSelectedType(type); // Update local state

    // Confirm immediately upon selection in this version
    // pendingConnectionParams check is technically redundant due to isOpen check below, but good practice
    if (pendingConnectionParams) {
      console.log(`[Modal] Confirming relationship: ${type}`); // Debug log
      confirmRelationshipSelection(type); // Call the stable action (this handles addEdge)
      // No need to call handleClose here, as confirmRelationshipSelection should set pendingConnectionParams to null, closing the modal
    } else {
       console.warn("[Modal] Attempted to select relationship without pending connection.");
       handleClose(); // Close anyway if state is inconsistent
    }
    // Note: The modal will close automatically when confirmRelationshipSelection sets pendingConnectionParams to null
  }, [pendingConnectionParams, confirmRelationshipSelection, handleClose]); // Removed handleClose from dependencies as it's called internally or state change closes modal
  // --- END REPLACEMENT CODE ---

  if (!isOpen || !pendingConnectionParams) { // Added !pendingConnectionParams for type safety
    return null;
  }

  // Find nodes using IDs from pendingConnectionParams
  const sourceNode = nodes.find(node => node.id === pendingConnectionParams.source);
  const targetNode = nodes.find(node => node.id === pendingConnectionParams.target);

  // Ensure source/target labels are accessed safely
  const sourceLabel = sourceNode?.data?.label || 'Source';
  const targetLabel = targetNode?.data?.label || 'Target';

  return (
    <Modal
      open={isOpen}
      onClose={handleClose} // Use the stable handler
      aria-labelledby="relationship-selector-title"
    >
      <Box sx={style}>
        <Typography id="relationship-selector-title" variant="h6" component="h2">
          Define Relationship
        </Typography>
        <Typography sx={{ mt: 1, mb: 2 }} variant="body2" color="text.secondary">
           How are '{sourceLabel}' and '{targetLabel}' related?
        </Typography>
        <List>
           {/* Map over the ALCHEMICAL_EDGES array */}
          {ALCHEMICAL_EDGES.map((option: AlchemicalEdge) => (
            // Use option.id as the key and for the selection value
            <ListItem key={option.id} disablePadding>
              {/* Use the stable handleSelect with option.id */}
              <ListItemButton onClick={() => handleSelect(option.id)} selected={selectedType === option.id}>
                <ListItemText
                    primary={option.label} // Use option.label
                    secondary={option.description || ''} // Use option.description
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
         {/* Removed explicit Confirm button for immediate selection confirmation */}
      </Box>
    </Modal>
  );
};

// Add default export to maintain compatibility with existing imports
export default RelationshipSelectorModal;
export { RelationshipSelectorModal }; // Also keep named export for flexibility 