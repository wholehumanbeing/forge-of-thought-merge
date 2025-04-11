import { CSSProperties } from 'react';

// V2: Definitive Semantic Edge Types based on Section III.B - REPLACED WITH BACKEND DEFINITION
export enum SemanticEdgeType {
  // Core Synthesis & Comparison
  SYNTHESIZES_WITH = "SYNTHESIZES_WITH",     // Core synthesis action outcome
  RESONATES_WITH = "RESONATES_WITH",         // Affinity, shared theme, echoes
  IS_ANALOGOUS_TO = "IS_ANALOGOUS_TO",       // Structural or functional similarity
  IS_METAPHOR_FOR = "IS_METAPHOR_FOR",       // Explicit metaphorical link
  ILLUSTRATES = "ILLUSTRATES",               // Provides an example or case study of
  DEFINES = "DEFINES",                       // Establishes the meaning or scope of

  // Contrast & Conflict
  OPPOSES = "OPPOSES",                       // General opposition or conflict
  CONTRADICTS_CLAIM = "CONTRADICTS_CLAIM",   // Specifically contradicts a statement/claim (vs. KG CONTRADICTS fact)
  CHALLENGES_PREMISE_OF = "CHALLENGES_PREMISE_OF", // Questions underlying assumptions
  REFUTES = "REFUTES",                       // Argues against, disproves
  LIMITS = "LIMITS",                         // Sets boundaries or constraints on
  GENERATES_PARADOX_FROM = "GENERATES_PARADOX_FROM", // Creates a paradoxical situation from
  RESOLVES_TENSION_BETWEEN = "RESOLVES_TENSION_BETWEEN", // Offers a resolution to a conflict/tension

  // Causality & Influence (User Perspective)
  ENABLES = "ENABLES",                       // Makes possible or facilitates
  CAUSES = "CAUSES",                         // Direct causal link (as interpreted by user)
  INFLUENCES = "INFLUENCES",                 // General influence (user interpretation, distinct from KG INFLUENCED_BY)
  AMPLIFIES = "AMPLIFIES",                   // Strengthens or intensifies
  REDUCES_TO = "REDUCES_TO",                 // Simplifies or boils down to
  DERIVES_FROM = "DERIVES_FROM",             // User-asserted derivation

  // Structure & Composition
  IS_COMPONENT_OF = "IS_COMPONENT_OF",       // User-defined part-whole relationship
  IS_AXIOM_FOR = "IS_AXIOM_FOR",             // User identifies something as axiomatic for another
  SYMBOLIZES = "SYMBOLIZES",                 // User interprets something as symbolic of another

  // Generic / Default
  RELATED_TO = "RELATED_TO",                 // Default, less specific relationship
}

// Define the structure for the V2 Alchemical Edges (incorporating Table IV.A/IV.C info)
// TODO: This structure and the ALCHEMICAL_EDGES list below need to be updated - DONE
//       to align with the *new* SemanticEdgeType enum values above.
//       The current mapping (e.g., using SemanticEdgeType.IS) is now invalid.
export interface AlchemicalEdge {
  id: SemanticEdgeType; // This type has changed!
  label: string; // User-facing label
  description: string; // Cognitive Role / Description
  category: string; // Category ID (e.g., 'logical', 'tensional')
  categoryLabel: string; // User-facing category label
  color: string; // Base color for styling (from Table VIII.D)
}

// V2: Categories for the 12 Alchemical Edges (from Table IV.A) - UPDATED for new types
// TODO: Review if these categories still make sense with the new edge types. - DONE
export const ALCHEMICAL_EDGE_CATEGORIES = [
  { id: 'core_synthesis', label: 'Core Synthesis & Comparison' },
  { id: 'contrast_conflict', label: 'Contrast & Conflict' },
  { id: 'causality_influence', label: 'Causality & Influence' },
  { id: 'structure_composition', label: 'Structure & Composition' },
  { id: 'generic', label: 'Generic / Default' },
  // Add/modify categories as needed based on the new enum
];

// V2: The Twelve Alchemical Edges - UPDATED for new SemanticEdgeType enum
// !!! IMPORTANT TODO: This list is now INCONSISTENT with the SemanticEdgeType enum above !!! - RESOLVED
// You MUST update this list to use the correct SemanticEdgeType values from the enum
// and decide how to map the original 12 concepts (if desired) or create a new list
// based on the backend's definition. - DONE
export const ALCHEMICAL_EDGES: AlchemicalEdge[] = [
  // Core Synthesis & Comparison
  {
    id: SemanticEdgeType.SYNTHESIZES_WITH,
    label: 'Synthesizes With',
    description: 'Core synthesis action outcome',
    category: 'core_synthesis',
    categoryLabel: 'Core Synthesis & Comparison',
    color: '#4CAF50', // Green
  },
  {
    id: SemanticEdgeType.RESONATES_WITH,
    label: 'Resonates With',
    description: 'Affinity, shared theme, echoes',
    category: 'core_synthesis',
    categoryLabel: 'Core Synthesis & Comparison',
    color: '#FFD700', // Gold
  },
  {
    id: SemanticEdgeType.IS_ANALOGOUS_TO,
    label: 'Is Analogous To',
    description: 'Structural or functional similarity',
    category: 'core_synthesis',
    categoryLabel: 'Core Synthesis & Comparison',
    color: '#2196F3', // Blue
  },
  {
    id: SemanticEdgeType.IS_METAPHOR_FOR,
    label: 'Is Metaphor For',
    description: 'Explicit metaphorical link',
    category: 'core_synthesis', // Or Structure/Composition?
    categoryLabel: 'Core Synthesis & Comparison',
    color: '#9C27B0', // Purple
  },
  {
    id: SemanticEdgeType.ILLUSTRATES,
    label: 'Illustrates',
    description: 'Provides an example or case study of',
    category: 'core_synthesis', // Or Structure/Composition?
    categoryLabel: 'Core Synthesis & Comparison',
    color: '#00BCD4', // Cyan
  },
  {
    id: SemanticEdgeType.DEFINES,
    label: 'Defines',
    description: 'Establishes the meaning or scope of',
    category: 'structure_composition', // More structural
    categoryLabel: 'Structure & Composition',
    color: '#607D8B', // Blue Grey
  },

  // Contrast & Conflict
  {
    id: SemanticEdgeType.OPPOSES,
    label: 'Opposes',
    description: 'General opposition or conflict',
    category: 'contrast_conflict',
    categoryLabel: 'Contrast & Conflict',
    color: '#F44336', // Red
  },
  {
    id: SemanticEdgeType.CONTRADICTS_CLAIM,
    label: 'Contradicts Claim',
    description: 'Specifically contradicts a statement/claim',
    category: 'contrast_conflict',
    categoryLabel: 'Contrast & Conflict',
    color: '#FF5722', // Deep Orange
  },
  {
    id: SemanticEdgeType.CHALLENGES_PREMISE_OF,
    label: 'Challenges Premise Of',
    description: 'Questions underlying assumptions',
    category: 'contrast_conflict',
    categoryLabel: 'Contrast & Conflict',
    color: '#FF9800', // Orange
  },
  {
    id: SemanticEdgeType.REFUTES,
    label: 'Refutes',
    description: 'Argues against, disproves',
    category: 'contrast_conflict',
    categoryLabel: 'Contrast & Conflict',
    color: '#E91E63', // Pink
  },
  {
    id: SemanticEdgeType.LIMITS,
    label: 'Limits',
    description: 'Sets boundaries or constraints on',
    category: 'contrast_conflict', // Or Structure?
    categoryLabel: 'Contrast & Conflict',
    color: '#795548', // Brown
  },
  {
    id: SemanticEdgeType.GENERATES_PARADOX_FROM,
    label: 'Generates Paradox From',
    description: 'Creates a paradoxical situation from',
    category: 'contrast_conflict', // Or Core Synthesis?
    categoryLabel: 'Contrast & Conflict',
    color: '#FFEB3B', // Yellow
  },
    {
    id: SemanticEdgeType.RESOLVES_TENSION_BETWEEN,
    label: 'Resolves Tension Between',
    description: 'Offers a resolution to a conflict/tension',
    category: 'contrast_conflict', // Or Core Synthesis?
    categoryLabel: 'Contrast & Conflict',
    color: '#8BC34A', // Light Green
  },

  // Causality & Influence (User Perspective)
  {
    id: SemanticEdgeType.ENABLES,
    label: 'Enables',
    description: 'Makes possible or facilitates',
    category: 'causality_influence',
    categoryLabel: 'Causality & Influence',
    color: '#03A9F4', // Light Blue
  },
  {
    id: SemanticEdgeType.CAUSES,
    label: 'Causes',
    description: 'Direct causal link (as interpreted by user)',
    category: 'causality_influence',
    categoryLabel: 'Causality & Influence',
    color: '#FFC107', // Amber
  },
  {
    id: SemanticEdgeType.INFLUENCES,
    label: 'Influences',
    description: 'General influence (user interpretation)',
    category: 'causality_influence',
    categoryLabel: 'Causality & Influence',
    color: '#CDDC39', // Lime
  },
  {
    id: SemanticEdgeType.AMPLIFIES,
    label: 'Amplifies',
    description: 'Strengthens or intensifies',
    category: 'causality_influence',
    categoryLabel: 'Causality & Influence',
    color: '#FF5722', // Deep Orange (Reused - maybe change?)
  },
  {
    id: SemanticEdgeType.REDUCES_TO,
    label: 'Reduces To',
    description: 'Simplifies or boils down to',
    category: 'causality_influence', // Or Structure?
    categoryLabel: 'Causality & Influence',
    color: '#9E9E9E', // Grey
  },
  {
    id: SemanticEdgeType.DERIVES_FROM,
    label: 'Derives From',
    description: 'User-asserted derivation',
    category: 'causality_influence',
    categoryLabel: 'Causality & Influence',
    color: '#009688', // Teal
  },

  // Structure & Composition
  {
    id: SemanticEdgeType.IS_COMPONENT_OF,
    label: 'Is Component Of',
    description: 'User-defined part-whole relationship',
    category: 'structure_composition',
    categoryLabel: 'Structure & Composition',
    color: '#BDBDBD', // Light Grey
  },
  {
    id: SemanticEdgeType.IS_AXIOM_FOR,
    label: 'Is Axiom For',
    description: 'User identifies something as axiomatic for another',
    category: 'structure_composition',
    categoryLabel: 'Structure & Composition',
    color: '#3F51B5', // Indigo
  },
  {
    id: SemanticEdgeType.SYMBOLIZES,
    label: 'Symbolizes',
    description: 'User interprets something as symbolic of another',
    category: 'structure_composition', // Or Core Synthesis?
    categoryLabel: 'Structure & Composition',
    color: '#FF00FF', // Magenta
  },

  // Generic / Default
  {
    id: SemanticEdgeType.RELATED_TO,
    label: 'Related To',
    description: 'Default, less specific relationship',
    category: 'generic',
    categoryLabel: 'Generic / Default',
    color: '#A0A0A0', // Muted Gray
  },
];


// Create a Record for efficient lookup by ID
// This should automatically work once ALCHEMICAL_EDGES is correctly updated. - CHECKED
export const ALCHEMICAL_EDGES_MAP: Record<SemanticEdgeType, AlchemicalEdge> =
    ALCHEMICAL_EDGES.reduce((acc, edge) => {
        acc[edge.id] = edge;
        return acc;
    }, {} as Record<SemanticEdgeType, AlchemicalEdge>);


// --- Helper Functions ---

// V2: Get style object based on SemanticEdgeType
// TODO: Review this function to ensure styles make sense for the *new* edge types. - DONE
export function getEdgeStyleByType(type: SemanticEdgeType | null | undefined): CSSProperties {
  if (!type) {
    // Default style for edges without a semantic type yet (or null)
    return { stroke: '#ccc', strokeWidth: 1, strokeDasharray: '5, 5' }; // Example: light grey dashed
  }
  // Use the MAP for efficiency
  const edgeInfo = ALCHEMICAL_EDGES_MAP[type];
  const baseColor = edgeInfo?.color || '#888'; // Default fallback color

  const style: CSSProperties = {
    stroke: baseColor,
    strokeWidth: 2, // Make defined edges slightly thicker
  };

  // Add specific styles based on type (matching Table VIII.D intentions where simple)
  // !!! IMPORTANT TODO: Update this switch statement for the NEW SemanticEdgeType values !!! - DONE
  switch (type) {
    // Add cases for NEW types, remove old ones
    case SemanticEdgeType.OPPOSES:
    case SemanticEdgeType.CONTRADICTS_CLAIM:
    case SemanticEdgeType.REFUTES:
       style.strokeWidth = 2.5; // Slightly thicker for contrast/conflict
      // style.strokeDasharray = '4, 4'; // Optional dash
      break;
    case SemanticEdgeType.CAUSES:
    case SemanticEdgeType.INFLUENCES:
    case SemanticEdgeType.DERIVES_FROM:
       // style.strokeDasharray = '1, 5'; // Optional dash
      break;
    case SemanticEdgeType.RELATED_TO:
        style.strokeDasharray = '6, 6'; // Dashed for generic
        break;
    // Add more specific styles if needed for other types
    // e.g., SemanticEdgeType.SYMBOLIZES could have a unique style

    default:
      // Default style for defined types without specific overrides (solid line, baseColor)
      break;
  }

  return style;
}

// --- Deprecated Constants (Keep for reference/potential migration if needed, but mark as deprecated) ---

/** @deprecated Replaced by ALCHEMICAL_EDGES_MAP and ALCHEMICAL_EDGES */
export interface SemanticRelationship {
    id: string; // Unique identifier (e.g., 'synthesizes_with')
    label: string; // User-facing label (e.g., 'Synthesizes With')
    description: string; // Description for tooltips or info
    category: string; // Category for grouping relationships
}

/** @deprecated Replaced by ALCHEMICAL_EDGES_MAP and ALCHEMICAL_EDGES */
export const SEMANTIC_RELATIONSHIPS: SemanticRelationship[] = [
    // ... (keep old list commented out or remove if confident)
    /*
  // Logical & Structural
  {
    id: 'contradicts',
    label: 'Contradicts',
    description: 'Logically incompatible with or negates the connected concept',
    category: 'logical'
  },
    ... etc ...
  {
    id: 'related_to',
    label: 'Related To',
    description: 'Has a general, unspecified relationship with the connected concept',
    category: 'general'
  },
    */
]; 