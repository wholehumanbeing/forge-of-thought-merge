import axios from 'axios';
import { Node, XYPosition } from 'reactflow'; // Added import for React Flow types
// import axios, { AxiosInstance, AxiosError } from 'axios'; // Remove this line
// Removed unused logger import
// Import only used types
import { 
    NodeData, 
    SynthesisResult, 
    GraphStructure, 
    KnowledgeNodeData,
    EdgeData,          
    NodeType,           
    NodeContextData,
    NodeDTO
} from '../types/api';
import { SemanticEdgeType } from '../constants/semanticRelationships'; // Added import for SemanticEdgeType
// Removed unused types: GraphInput, FullLineageResponse, ConceptInfo, ApiSeedConcept, SynthesisResponse
// Removed unused Node import
// Removed unused ApiSeedConcept import from App.tsx

// Define a minimal interface for the properties we access on an Axios error
interface AxiosErrorLike {
  isAxiosError: true;
  response?: {
    status: number;
    data: unknown;
  };
  request?: unknown;
  message: string;
}

// Define a typed interface for the response seed concept structure
interface SeedConcept {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  original_id?: string;
  type?: NodeType | string;
}

// Define type for potential wrapped response
interface WrappedSuggestionsResponse {
  suggestions: SemanticEdgeType[];
}

// Type guard to check for the wrapped response structure
function isWrappedSuggestionsResponse(data: unknown): data is WrappedSuggestionsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'suggestions' in data &&
    Array.isArray((data as WrappedSuggestionsResponse).suggestions)
  );
}

// Retrieve the base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

console.log(">>> USING API_BASE_URL:", API_BASE_URL); // Add this log

if (!API_BASE_URL) {
  console.error("VITE_API_BASE_URL is not defined in the environment variables.");
  // Handle the missing environment variable appropriately
  // For example, throw an error or use a default URL for development
}

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS with credentials
  withCredentials: true,
  // Add timeout to prevent long-hanging requests
  timeout: 10000, // 10 seconds
});

/**
 * Invokes the backend synthesis endpoint.
 * @param graph - The graph structure containing nodes and edges.
 * @returns A promise that resolves with the synthesis result.
 * @throws Throws an error if the API request fails.
 */
export const invokeSynthesis = async (graph: GraphStructure): Promise<SynthesisResult> => {
  try {
    // --- Transformation Step ---
    // Input: graph.edges should conform to GraphStructure['edges'] type in api.ts
    //        (id, source, target, semantic_type?, label?, potentially other data)
    // Output: Backend expects EdgeData format: { id, source, target, semantic_type, data?: { label?, ... } }
    const transformedEdges = graph.edges.map(edge => {
      // Define the structure expected by the backend Pydantic model EdgeData
      const backendEdge: {
          id: string;
          source: string;
          target: string;
          semantic_type: SemanticEdgeType | string | null; // Backend expects this top-level
          data?: Record<string, unknown>; // Backend expects optional data field
      } = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          semantic_type: edge.semantic_type ?? null // Directly use the top-level semantic_type from the input edge
      };

      // Prepare the optional 'data' object for the backend
      const backendData: Record<string, unknown> = {};

      // Check if the input edge has a top-level label (as defined in internal FE EdgeData)
      // If so, move it inside the 'data' object for the backend
      if ('label' in edge && edge.label) {
        backendData.label = edge.label;
      }

      // If the input edge *also* had a data object, merge its contents
      // This handles cases where other miscellaneous data might be stored.
      // Ensure this merge logic aligns with actual data storage practices.
      if (edge.data && typeof edge.data === 'object') {
        Object.assign(backendData, edge.data);
      }

      // Assign the constructed data object if it's not empty
      if (Object.keys(backendData).length > 0) {
          backendEdge.data = backendData;
      }

      return backendEdge;
    });

    // Construct the final payload for the API
    const payload = {
      nodes: graph.nodes, // Assuming nodes are already compatible
      edges: transformedEdges,
    };
    // --- End Transformation Step ---

    // Send the transformed payload
    const response = await apiClient.post<SynthesisResult>('/synthesis/', payload);
    return response.data;
  } catch (error) {
    // Runtime check for Axios error structure
    const isRuntimeAxiosError = 
      error && 
      typeof error === 'object' && 
      'isAxiosError' in error && 
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      // Assert to our specific interface after the runtime check
      const axiosError = error as AxiosErrorLike;
      console.error('Error invoking synthesis API (AxiosError):', axiosError.response?.data || axiosError.message);

      if (axiosError.response) {
        // Server responded with a status code outside 2xx
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        // Request made but no response received
        throw new Error('Network Error: No response received from the server.');
      } else {
        // Error setting up the request
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      // Handle non-Axios errors
      console.error('An unexpected error occurred:', error);
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Calls the backend to get seed concepts for a selected archetype.
 * @param archetypeId - The ID of the selected archetype.
 * @returns A promise that resolves with the list of seed nodes (Node<KnowledgeNodeData>).
 * @throws Throws an error if the API request fails.
 */
export const selectArchetype = async (archetypeId: string): Promise<Node<KnowledgeNodeData>[]> => {
  try {
    const endpoint = '/onboarding/select-archetype';
    const fullUrl = `${apiClient.defaults.baseURL}${endpoint}`; // Construct the full URL
    console.info(`Attempting POST request to: ${fullUrl}`); // Log the full URL

    // Expect the response data to contain seed_concepts array
    const response = await apiClient.post<{ seed_concepts: SeedConcept[] }>(endpoint, { archetype_id: archetypeId });

    // Debug the response
    console.log("API Response:", JSON.stringify(response.data));

    // Validate the response structure
    if (!response.data || !Array.isArray(response.data.seed_concepts)) {
        console.error('Invalid response format from select-archetype endpoint. Expected { seed_concepts: [...] }.', response.data);
        throw new Error('API response format for seed concepts is invalid.');
    }

    // Transform the SeedConcept array to Node<KnowledgeNodeData>[]
    const nodes: Node<KnowledgeNodeData>[] = response.data.seed_concepts.map((concept: SeedConcept, index: number) => {
      // Determine NodeType safely
      let nodeType: NodeType = NodeType.Concept; // Default
      if (concept.type && Object.values(NodeType).includes(concept.type as NodeType)) {
          nodeType = concept.type as NodeType;
      } else if (typeof concept.type === 'string') {
          console.warn(`Received unknown node type string '${concept.type}' for seed concept ID ${concept.id}. Defaulting to Concept.`);
      }

      // IMPORTANT FIX: Explicitly initialize all required fields and ensure the node type is 'knowledgeNode'
      const node: Node<KnowledgeNodeData> = {
        id: concept.id, // Use ID from the backend
        position: { 
          x: typeof concept.x === 'number' ? concept.x : (index * 150), 
          y: typeof concept.y === 'number' ? concept.y : 100 
        },
        type: 'knowledgeNode', // CRITICAL FIX: Always use 'knowledgeNode' as the node type
        data: {
          label: concept.label || 'Unnamed Concept',
          description: concept.description || '',
          type: nodeType,
          original_id: concept.original_id || concept.id,
          concept_source: 'seed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as KnowledgeNodeData
      };

      console.log(`[DEBUG] Created node:`, node);
      return node;
    });

    return nodes;

  } catch (error) {
    // Reuse the existing error handling logic, adapting messages if needed
    const isRuntimeAxiosError =
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      const axiosError = error as AxiosErrorLike;
      console.error('Error selecting archetype (AxiosError):', axiosError.response?.data || axiosError.message);

      if (axiosError.response) {
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        throw new Error('Network Error: No response received from the server.');
      } else {
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      console.error('An unexpected error occurred during archetype selection:', error);
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Fetches context for a specific node.
 * @param nodeKiId - The KI ID of the node.
 * @returns A promise that resolves with the node context data.
 * @throws Throws an error if the API request fails.
 */
export const getNodeContext = async (nodeKiId: string): Promise<NodeContextData> => {
  try {
    const response = await apiClient.get<NodeContextData>(`/concepts/${nodeKiId}/context`);
    return response.data;
  } catch (error) {
    const isRuntimeAxiosError =
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      const axiosError = error as AxiosErrorLike;
      console.error(`Error fetching node context for ${nodeKiId} (AxiosError):`, axiosError.response?.data || axiosError.message);
      if (axiosError.response) {
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        throw new Error('Network Error: No response received from the server.');
      } else {
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      console.error('An unexpected error occurred during node context fetch:', error);
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Fetches node suggestions related to a focus node.
 * @param focusNodeKiId - The KI ID of the node to get suggestions for.
 * @param currentNodeIds - An array of KI IDs currently on the canvas.
 * @returns A promise that resolves with an array of suggested nodes (NodeData).
 * @throws Throws an error if the API request fails.
 */
export const getNodeSuggestions = async (focusNodeKiId: string, currentNodeIds: string[]): Promise<NodeData[]> => {
  try {
    const response = await apiClient.get<NodeData[]>(`/suggestions/nodes/${focusNodeKiId}`, {
      params: { current_node_ids: currentNodeIds }, // Pass array as query param (FastAPI usually handles repeated params)
      // Axios might require a specific paramsSerializer depending on backend expectation
      // paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
    });
    return response.data;
  } catch (error) {
    const isRuntimeAxiosError =
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      const axiosError = error as AxiosErrorLike;
      console.error(`Error fetching node suggestions for ${focusNodeKiId} (AxiosError):`, axiosError.response?.data || axiosError.message);
      if (axiosError.response) {
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        throw new Error('Network Error: No response received from the server.');
      } else {
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      console.error('An unexpected error occurred during node suggestion fetch:', error);
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Fetches edge suggestions between two nodes based on their types, labels, and KI IDs.
 * @param sourceNode - The full source node object (React Flow Node).
 * @param targetNode - The full target node object (React Flow Node).
 * @returns A promise that resolves with an array of suggested semantic edge types (SemanticEdgeType[]).
 * @throws Throws an error if the API request fails.
 */
export const getEdgeSuggestions = async (
    sourceNode: Node<KnowledgeNodeData>, 
    targetNode: Node<KnowledgeNodeData>
): Promise<SemanticEdgeType[]> => {
  // Ensure nodes and their data are available
  if (!sourceNode?.data || !targetNode?.data) {
      console.error('getEdgeSuggestions called with invalid node data', { sourceNode, targetNode });
      throw new Error('Source or target node data is missing.');
  }

  const payload = {
    source_type: sourceNode.data.type,
    target_type: targetNode.data.type,
    source_label: sourceNode.data.label,
    target_label: targetNode.data.label,
    source_ki_id: sourceNode.data.ki_id || null,
    target_ki_id: targetNode.data.ki_id || null,
  };

  try {
    console.debug('Fetching edge suggestions with payload:', payload); // Log payload for debugging
    // Type the potential response union
    const response = await apiClient.post<SemanticEdgeType[] | WrappedSuggestionsResponse>('/api/v1/suggestions/edges', payload);

    // Handle potential response wrapping (e.g., { "suggestions": [...] })
    if (Array.isArray(response.data)) {
        return response.data; // Direct array response
    } else if (isWrappedSuggestionsResponse(response.data)) {
        return response.data.suggestions; // Wrapped response
    } else {
        console.warn('Received unexpected format for edge suggestions:', response.data);
        return []; // Return empty array for unexpected formats
    }

  } catch (error) {
    // Using the established error handling pattern
    const isRuntimeAxiosError =
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      const axiosError = error as AxiosErrorLike;
      console.error(`Error fetching edge suggestions (AxiosError):`, axiosError.response?.data || axiosError.message, { payload });
      if (axiosError.response) {
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        throw new Error('Network Error: No response received from the server.');
      } else {
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      console.error('An unexpected error occurred during edge suggestion fetch:', error, { payload });
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// --- Concept Search Function ---
/**
 * Searches for concepts via the backend API.
 * @param query - The search term to query for.
 * @returns A promise that resolves with an array of matching concepts (NodeData).
 * @throws Throws an error if the API request fails.
 */
export const searchConcepts = async (
  query: string,
  limit: number = 20 // Default limit
): Promise<NodeData[]> => {
  console.log('[api.ts] searchConcepts called with query:', query, 'limit:', limit); // LOG 1
  try {
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', String(limit));

    const url = \`/concepts/search?${params.toString()}\`;
    console.log('[api.ts] Attempting to fetch from URL:', apiClient.defaults.baseURL + url); // LOG 2

    const response = await apiClient.get<NodeDTO[]>(url); // Expecting NodeDTO array based on getRandomConcept
    
    console.log('[api.ts] Raw response from /concepts/search:', response); // LOG 3
    console.log('[api.ts] Raw response data from /concepts/search:', response.data); // LOG 4

    // Assuming the backend returns data that's directly usable or needs minimal mapping
    // If NodeDTO is the correct type and structure from backend for concepts,
    // and NodeData is the expected type by the LibraryPanel,
    // we need to ensure they are compatible or map them.
    // For now, let's assume NodeDTO[] is compatible with NodeData[] or a direct subset.
    // If your backend returns objects that are directly `NodeData` compliant, this is fine.
    // If they are `NodeDTO` and need transformation to `NodeData` for the store/panel,
    // that transformation should happen here or in the component.

    // Example of a simple mapping if NodeDTO and NodeData are different:
    // const mappedResults: NodeData[] = response.data.map(dto => ({
    //   id: dto.id,
    //   label: dto.label,
    //   type: dto.type,
    //   // ... other NodeData properties from dto
    //   // position: { x: 0, y: 0 } // Default position if not provided by search
    // }));
    // console.log('[api.ts] Mapped results (if any mapping was done):', mappedResults); // LOG 5 (if mapping)

    // If NodeDTO is essentially NodeData for the context of search results:
    const results: NodeData[] = response.data.map(item => ({
      ...item, // Spread properties from NodeDTO
      // Ensure all properties required by NodeData are present
      // If 'position' is required by NodeData but not in NodeDTO from search, add a default
      position: item.position || { x: Math.random() * 400, y: Math.random() * 400 }, // Example default
      // Ensure 'type' is correctly mapped if it's just a string from backend
      type: item.type || NodeType.Concept, // Example default type
      data: { // Assuming NodeData has a 'data' object for 'label', 'description' etc.
        label: item.label,
        // description: item.description, // if description comes from backend
      }
    }));

    console.log('[api.ts] Processed results to be returned:', results); // LOG 5 (or 6 if mapping)
    return results;

  } catch (error) {
    const isRuntimeAxiosError =
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      const axiosError = error as AxiosErrorLike;
      console.error('[api.ts] Error fetching concepts (AxiosError):', axiosError.response?.data || axiosError.message, axiosError); // LOG 6 (or 7)
      throw new Error(
        `API Error searching concepts: ${axiosError.response?.status} - ${JSON.stringify(axiosError.response?.data) || axiosError.message}`
      );
    } else {
      console.error('[api.ts] Unexpected error fetching concepts:', error); // LOG 7 (or 8)
      throw new Error(`Unexpected error searching concepts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
// --- End Concept Search Function ---

// --- Node/Edge CRUD Stubs ---

/**
 * Placeholder function to add a node via the backend API.
 * @param nodeData - Data for the new node.
 * @returns A promise that resolves with the created node data (placeholder).
 */
export const addNode = async (nodeData: { type: NodeType; position: XYPosition; data: Partial<KnowledgeNodeData> }): Promise<Node<KnowledgeNodeData>> => {
  console.warn('API function addNode not fully implemented. Received:', nodeData);
  // Placeholder: Simulate returning the created node with an ID
  const newNode: Node<KnowledgeNodeData> = {
    id: `server-${Date.now()}`, // Simulate server-generated ID
    type: 'custom', // Assuming 'custom' type like in canvasStore
    position: nodeData.position,
    data: {
        // Ensure required fields from KnowledgeNodeData are present or provide defaults
        label: nodeData.data.label || 'New Node',
        type: nodeData.type,
        description: nodeData.data.description || '-',
        concept_type: nodeData.data.concept_type,
        // Spread the rest of the partial data
        ...nodeData.data,
    }
  };
  return Promise.resolve(newNode);
};

/**
 * Placeholder function to add an edge via the backend API.
 * @param edgeData - Data for the new edge (source, target, data).
 * @returns A promise that resolves when the operation is complete (placeholder).
 */
export const addEdge = async (edgeData: { source: string | null | undefined; target: string | null | undefined; data: Partial<EdgeData> }): Promise<void> => {
  console.warn('API function addEdge not fully implemented. Received:', edgeData);
  return Promise.resolve();
};

/**
 * Placeholder function to update an edge via the backend API.
 * @param edgeId - The ID of the edge to update.
 * @param data - The partial data to update the edge with.
 * @returns A promise that resolves when the operation is complete (placeholder).
 */
export const updateEdge = async (edgeId: string, data: Partial<EdgeData>): Promise<void> => {
  console.warn(`API function updateEdge not fully implemented for edge ${edgeId}. Received:`, data);
  return Promise.resolve();
};

// --- End Node/Edge CRUD Stubs ---

/**
 * Fetches a random concept from the backend to bootstrap the canvas.
 * @returns A promise that resolves with a random concept node.
 * @throws Throws an error if the API request fails.
 */
export const getRandomConcept = async (): Promise<NodeDTO> => {
  try {
    const response = await apiClient.get<NodeDTO>('/concepts/random');
    return response.data;
  } catch (error) {
    // Runtime check for Axios error structure
    const isRuntimeAxiosError = 
      error && 
      typeof error === 'object' && 
      'isAxiosError' in error && 
      (error as Record<string, unknown>).isAxiosError === true;

    if (isRuntimeAxiosError) {
      // Assert to our specific interface after the runtime check
      const axiosError = error as AxiosErrorLike;
      console.error('Error fetching random concept (AxiosError):', axiosError.response?.data || axiosError.message);

      if (axiosError.response?.status === 404) {
        throw new Error('No concepts found in the database. Please seed the database first.');
      } else if (axiosError.response) {
        throw new Error(`API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        throw new Error('Network Error: No response received from the server.');
      } else {
        throw new Error(`Request Setup Error: ${axiosError.message}`);
      }
    } else {
      // Handle non-Axios errors
      console.error('An unexpected error occurred:', error);
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 