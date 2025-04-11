import React from 'react';
import { Modal, Box, Typography, Button, Grid, Tooltip, Divider } from '@mui/material';
import useCanvasStore from '../store/canvasStore';
import {
    ALCHEMICAL_EDGES,
    AlchemicalEdge,
    SemanticEdgeType,
    ALCHEMICAL_EDGE_CATEGORIES
} from '../constants/semanticRelationships';
import logger from '../utils/logger';
import { styled, Theme } from '@mui/material/styles';

// V2: Styled component for the modal content
const ModalContent = styled(Box)(({ theme }: { theme: Theme }) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'clamp(400px, 60vw, 700px)',
    maxHeight: '80vh',
    overflowY: 'auto',
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[24],
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    outline: 'none',
}));

const CategoryHeader = styled(Typography)(({ theme }: { theme: Theme }) => ({
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
    color: theme.palette.text.secondary,
}));

// Explicitly type props for styled component
interface RelationshipButtonProps {
    edgecolor: string;
    theme?: Theme; // theme is implicitly passed but can be typed
}

const RelationshipButton = styled(Button)<RelationshipButtonProps>(({ theme, edgecolor }) => ({
    margin: theme?.spacing(0.5), // Use optional chaining if theme might be undefined (shouldn't be)
    borderColor: edgecolor,
    color: edgecolor,
    '&:hover': {
        backgroundColor: `${edgecolor}1A`, // Slight background tint on hover
        borderColor: edgecolor,
    },
}));


const RelationshipSelectorModal: React.FC = () => {
    const isRelationshipSelectorOpen = useCanvasStore((state) => state.isRelationshipSelectorOpen);
    const closeRelationshipSelector = useCanvasStore((state) => state.closeRelationshipSelector);
    const confirmRelationshipSelection = useCanvasStore((state) => state.confirmRelationshipSelection);
    const pendingConnectionParams = useCanvasStore((state) => state.pendingConnectionParams);
    // const edgeSuggestions = useCanvasStore((state) => state.edgeSuggestions); // Keep if suggestions influence display

    // V2: Group edges by category
    const groupedEdges = React.useMemo(() => {
        const groups: { [key: string]: AlchemicalEdge[] } = {};
        ALCHEMICAL_EDGES.forEach(edge => {
            if (!groups[edge.category]) {
                groups[edge.category] = [];
            }
            groups[edge.category].push(edge);
        });
        // Sort categories based on ALCHEMICAL_EDGE_CATEGORIES order
        const orderedGroups: { [key: string]: AlchemicalEdge[] } = {};
        ALCHEMICAL_EDGE_CATEGORIES.forEach(cat => {
            if (groups[cat.id]) {
                orderedGroups[cat.id] = groups[cat.id];
            }
        });
        return orderedGroups;
    }, []);

    const handleRelationshipSelect = (selectedType: SemanticEdgeType) => {
        logger.debug(`Relationship selected: ${selectedType}`);
        confirmRelationshipSelection(selectedType);
        // The action now handles closing the modal and resetting state
    };

    const handleClose = (_event: object, reason: "backdropClick" | "escapeKeyDown") => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            logger.debug('Modal closed via backdrop or escape key');
            closeRelationshipSelector(); // Ensure pending state is cleared
        }
    };

    // Find category labels for display
    const getCategoryLabel = (categoryId: string): string => {
        return ALCHEMICAL_EDGE_CATEGORIES.find(cat => cat.id === categoryId)?.label || categoryId;
    }

    if (!isRelationshipSelectorOpen || !pendingConnectionParams) {
        // Don't render if not open or if somehow opened without pending params
        if (isRelationshipSelectorOpen && !pendingConnectionParams) {
            logger.warn("RelationshipSelectorModal is open but pendingConnectionParams is null. Closing.");
            // Schedule closing to avoid issues during render
            setTimeout(closeRelationshipSelector, 0);
        }
        return null;
    }

    return (
        <Modal
            open={isRelationshipSelectorOpen}
            onClose={handleClose}
            aria-labelledby="relationship-selector-title"
            aria-describedby="relationship-selector-description"
        >
            <ModalContent>
                <Typography id="relationship-selector-title" variant="h6" component="h2" gutterBottom>
                    Define Relationship
                </Typography>
                <Typography id="relationship-selector-description" sx={{ mb: 2 }}>
                    Select the alchemical edge that best represents the connection.
                </Typography>
                <Divider sx={{ my: 1 }}/>

                {Object.entries(groupedEdges).map(([categoryId, edges]) => (
                    <Box key={categoryId} mb={2}>
                        <CategoryHeader variant="subtitle1">
                            {getCategoryLabel(categoryId)}
                        </CategoryHeader>
                        <Grid container spacing={1}>
                            {edges.map((edge: AlchemicalEdge) => (
                                <Grid item key={edge.id}>
                                    <Tooltip title={edge.description} placement="top" arrow>
                                        <RelationshipButton
                                            variant="outlined"
                                            edgecolor={edge.color}
                                            onClick={() => handleRelationshipSelect(edge.id)}
                                        >
                                            {edge.label}
                                        </RelationshipButton>
                                    </Tooltip>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}

                 <Divider sx={{ my: 2 }}/>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button onClick={closeRelationshipSelector} color="secondary">
                        Cancel
                    </Button>
                </Box>
            </ModalContent>
        </Modal>
    );
};

export default RelationshipSelectorModal; 