import { Node } from "@/store/useForgeStore"; // Assuming Node type is compatible

// In Vite, environment variables are accessed via import.meta.env
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

interface ApiNodeData {
  id: string; // This is the primary ID from Neo4j (e.g., elementId or a custom UUID)
  label: string;
  type: string; // Corresponds to NodeType enum in backend (e.g., "CONCEPT", "THINKER")
  ki_id?: string; // Knowledge Infrastructure ID, if available
  data?: { // This matches the structure where additional properties might be nested
    description?: string;
    color?: string; 
    // Position from backend NodeData might be under 'data' or top-level based on Pydantic model
    // The backend NodeData in concepts.py seems to use top-level ki_id, label, type.
    // Let's assume `pos` for the 3D client isn't directly set by search results, 
    // but rather determined upon placement or loaded from client-side store if already exists.
    // For now, the `mapApiNodeToStoreNode` will assign a default if not found.
  };
  // Backend NodeData also has: created_at, updated_at. We can add them if needed.
}

// Helper to map backend data to frontend Node type
// This is crucial if backend NodeData and client-3d Node are not identical
const mapApiNodeToStoreNode = (apiNode: ApiNodeData): Node => {
  return {
    // The backend /search returns NodeData which has `id` (primary key from DB), `label`, `type`, `ki_id`.
    // The client-3d Node type also has `id`. We should ensure consistency.
    // If ki_id is the canonical ID to use across systems, prefer that.
    // If backend /search returns elementId as `id`, that should be used.
    id: apiNode.ki_id || apiNode.id, 
    label: apiNode.label,
    type: apiNode.type,
    color: apiNode.data?.color || "#ADD8E6", // Default light blue, can be based on type later
    pos: [0, 0, 0], // Default position, will be set upon placement
    // scale: undefined, // Default scale, can be set upon placement or by type
  };
};

export const searchConcepts = async (query: string, limit: number = 20): Promise<Node[]> => {
  try {
    // Ensure the path matches your backend router exactly.
    // If concepts router is mounted at /api/v1/concepts, this is correct.
    const response = await fetch(`${API_BASE_URL}/api/v1/concepts/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      console.error("Error searching concepts:", response.status, errorData);
      throw new Error(`Failed to fetch concepts: ${errorData.detail || response.statusText}`);
    }
    const data: ApiNodeData[] = await response.json();
    return data.map(mapApiNodeToStoreNode);
  } catch (error) {
    console.error("Error in searchConcepts:", error);
    throw error; 
  }
};

// Add other API functions here, e.g., for synthesis, fetching a single random concept
export const getRandomConcept = async (): Promise<Node | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/concepts/random`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn("No random concepts found (404).");
        return null;
      }
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      console.error("Error fetching random concept:", response.status, errorData);
      throw new Error(`Failed to fetch random concept: ${errorData.detail || response.statusText}`);
    }
    const data: ApiNodeData = await response.json(); 
    // The backend GET /random returns ConceptOut, which includes id, label, type, ki_id, and data (with description)
    // This structure should map correctly via mapApiNodeToStoreNode.
    return mapApiNodeToStoreNode(data);
  } catch (error) {
    console.error("Error in getRandomConcept:", error);
    throw error;
  }
};

// TODO: Define types for GraphStructure (nodes, edges) to send to synthesis
// export const triggerSynthesis = async (graphData: GraphStructure): Promise<SynthesisResult> => { ... } 