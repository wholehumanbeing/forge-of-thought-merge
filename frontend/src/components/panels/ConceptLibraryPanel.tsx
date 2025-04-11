import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { searchConcepts } from '../../services/api';
import { NodeType, NodeData /*, KnowledgeNodeData, isKnowledgeNodeData */ } from '../../types/api';
import './ConceptLibraryPanel.css';
import logger from '../../utils/logger';

// Define the structure expected from the API search results
// Based on backend NodeData: { id, type, label, data: { description }, ki_id }
interface ApiNodeData {
    id: string; // Backend's internal ID (ReactFlow node ID)
    type: NodeType | string; // Can be enum value or raw string
    label: string;
    ki_id?: string; // Knowledge Item ID
    data?: { // Nested data object
      description?: string;
      [key: string]: any; // Allow other properties within data
    };
    // Allow other potential top-level fields from the API response
    [key: string]: any;
}

// Internal representation for display, mapping from API result
interface DisplayConceptInfo {
  id: string;       // Mapped from ki_id / original_id
  name: string;     // Mapped from label
  description?: string;
  type?: NodeType;  // Store the type
}

const ConceptLibraryPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  // Use the new DisplayConceptInfo type for state
  const [concepts, setConcepts] = useState<DisplayConceptInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConcepts = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setConcepts([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // searchConcepts returns NodeData[]
      const results: NodeData[] = await searchConcepts(trimmedQuery);
      console.log("API Response Data:", results);
      logger.debug(`Search results for "${trimmedQuery}":`, results);

      // Map API response (now assumed to be ApiNodeData[]) to DisplayConceptInfo[]
      const mappedConcepts: DisplayConceptInfo[] = results
        .map((node): DisplayConceptInfo | null => {
          // Basic validation: Ensure node is an object and has necessary fields
          // Cast to our expected API structure for checking
          const apiNode = node as ApiNodeData;
          if (!apiNode || typeof apiNode !== 'object' || !apiNode.label || !apiNode.type) {
            logger.warn('Skipping invalid node structure from API:', apiNode);
            return null;
          }

          // Validate NodeType
          const nodeType = Object.values(NodeType).includes(apiNode.type as NodeType)
            ? apiNode.type as NodeType
            : undefined;

          return {
            // Use ki_id if available, otherwise fallback to a generated ID based on label
            id: apiNode.ki_id || apiNode.label.toLowerCase().replace(/\s+/g, '-'),
            name: apiNode.label || "Untitled Concept",
            // Access description safely from the nested 'data' object
            description: apiNode.data?.description,
            type: nodeType // Use validated NodeType
          };
        })
        .filter((concept): concept is DisplayConceptInfo => concept !== null); // Filter out any nulls from invalid nodes

      // Log if any results were filtered out *during mapping*
      // if (results.length > mappedConcepts.length) { // <-- This logging logic might now be misleading
      //   logger.warn(`Filtered out ${results.length - mappedConcepts.length} search results that did not match KnowledgeNodeData structure.`);
      // }

      console.log("Updating state with:", mappedConcepts);
      setConcepts(mappedConcepts);
    } catch (err) {
      logger.error("Failed to fetch concepts:", err);
      // Check if the error object has a response and message property
      let errorMessage = 'Failed to load concepts';
      if (err && typeof err === 'object' && 'message' in err) {
         errorMessage = (err as Error).message;
      }
      setError(errorMessage);
      setConcepts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConcepts(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchConcepts]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // getNodeType can now directly use the type property from DisplayConceptInfo
  const getNodeType = (type: NodeType | undefined): NodeType => {
    return type || NodeType.Concept; // Default to Concept
  };

  // Update onDragStart to use DisplayConceptInfo
  const onDragStart = (event: React.DragEvent, concept: DisplayConceptInfo) => {
    const nodeType = getNodeType(concept.type);

    // Use properties from DisplayConceptInfo for drag data
    const dragData = {
      nodeType: nodeType,
      label: concept.name,
      ki_id: concept.id, // This is the mapped ID (from original_id or generated)
      description: concept.description || ''
    };

    logger.debug('Dragging concept with data:', dragData);

    try {
      event.dataTransfer.setData('application/reactflow', JSON.stringify(dragData));
      event.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      logger.error('Failed to set drag data:', error);
    }
  };

  return (
    <aside className="concept-library-panel">
      <h3>Concept Library</h3>

      {/* Search input remains */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search concepts (min 2 chars)..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="concept-search-input"
        />
        {searchTerm && (
          <button
            className="clear-search-btn"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Concept display area - Simplified logic */}
      <div className="concept-list">
        {isLoading && <p className="status-message">Loading...</p>}

        {error && <p className="error-message">Error: {error}</p>}

        {!isLoading && !error && searchTerm.trim().length < 2 && (
           <p className="status-message">Enter 2+ characters to search.</p>
        )}

        {!isLoading && !error && searchTerm.trim().length >= 2 && concepts.length === 0 && (
          <p className="status-message">No concepts found for "{debouncedSearchTerm}".</p>
        )}

        {!isLoading && !error && concepts.map((concept) => (
          <div
            key={concept.id} // Use the mapped unique ID as key
            // Use type for class, default to 'concept'
            className={`concept-item draggable-node type-${concept.type || NodeType.Concept}`}
            onDragStart={(event) => onDragStart(event, concept)}
            draggable
            title={concept.description || concept.name}
          >
            <span className="concept-icon">
              {/* Use concept.type for icon logic */}
              {concept.type === NodeType.Thinker ? '👤' :
               concept.type === NodeType.School ? '🏛️' :
               concept.type === NodeType.Metaphor ? '🔄' : '💡'} { /* Default icon */}
            </span>
            <span className="concept-name">{concept.name}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ConceptLibraryPanel; 