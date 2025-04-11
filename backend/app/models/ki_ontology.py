import enum

class NodeType(enum.Enum):
    """Defines the types of nodes within the knowledge infrastructure.
    
    These represent the fundamental categories of entities stored and reasoned about.
    """
    CONCEPT = "CONCEPT"
    THINKER = "THINKER"
    WORK = "WORK"
    SCHOOL_OF_THOUGHT = "SCHOOL_OF_THOUGHT"
    HISTORICAL_CONTEXT = "HISTORICAL_CONTEXT"
    SYMBOLIC_SYSTEM = "SYMBOLIC_SYSTEM"
    FIELD_OF_STUDY = "FIELD_OF_STUDY"
    ARCHETYPE = "ARCHETYPE"
    MYTH = "MYTH"
    SYMBOL = "SYMBOL"
    AXIOM = "AXIOM"
    METAPHOR = "METAPHOR"
    PARADOX = "PARADOX" # Added based on previous discussions
    NARRATIVE = "NARRATIVE" # Added based on previous discussions
    PATTERN = "PATTERN" # Added based on previous discussions
    # Add any other types required by the comprehensive plan


class RelationshipType(enum.Enum):
    """Defines internal, structural relationships within the knowledge graph.
    
    These relationships are typically inferred or curated by the system to represent
    ontological connections, provenance, and established facts based on source material.
    They are distinct from user-created semantic connections on the canvas.
    """
    SUBCLASS_OF = "SUBCLASS_OF"           # Ontological hierarchy (e.g., Thinker SUBCLASS_OF Person)
    INSTANCE_OF = "INSTANCE_OF"           # Classification (e.g., Plato INSTANCE_OF Thinker)
    PART_OF = "PART_OF"                   # Meronymy (e.g., Chapter PART_OF Book)
    INFLUENCED_BY = "INFLUENCED_BY"       # Documented influence (e.g., Kant INFLUENCED_BY Hume)
    DISCUSSED_BY = "DISCUSSED_BY"         # A thinker/work discusses a concept/work (e.g., Concept DISCUSSED_BY Work)
    CONTRADICTS = "CONTRADICTS"           # Documented contradiction (e.g., TheoryA CONTRADICTS TheoryB in SourceX)
    CITES = "CITES"                       # A work cites another work
    USES_METAPHOR = "USES_METAPHOR"       # A work or thinker employs a specific metaphor concept
    BASED_ON_AXIOM = "BASED_ON_AXIOM"     # A work or theory is based on a specific axiom concept
    DERIVED_FROM = "DERIVED_FROM"         # Direct derivation (e.g., ConceptA DERIVED_FROM ConceptB)
    PRECEDES = "PRECEDES"                 # Historical/temporal precedence
    CONTEMPORARY_WITH = "CONTEMPORARY_WITH" # Existing/occurring in the same time period
    LOCATED_IN = "LOCATED_IN"             # Geographic or contextual location
    HAS_AUTHOR = "HAS_AUTHOR"             # Connecting Work to Thinker
    HAS_MEMBER = "HAS_MEMBER"             # Connecting SchoolOfThought to Thinker
    RELATED_TO = "RELATED_TO"             # Generic fallback relationship
    # Add other structural relationships as needed


class SemanticEdgeType(enum.Enum):
    """Defines user-assignable semantic relationships for the frontend canvas.
    
    These types represent the interpretive connections made by the user during synthesis,
    allowing for nuanced and potentially subjective links between nodes. They differ
    from the more objective, structural RelationshipTypes used internally in the KG.
    """
    # Core Synthesis & Comparison
    SYNTHESIZES_WITH = "SYNTHESIZES_WITH"     # Core synthesis action outcome
    RESONATES_WITH = "RESONATES_WITH"         # Affinity, shared theme, echoes
    IS_ANALOGOUS_TO = "IS_ANALOGOUS_TO"       # Structural or functional similarity
    IS_METAPHOR_FOR = "IS_METAPHOR_FOR"       # Explicit metaphorical link
    ILLUSTRATES = "ILLUSTRATES"               # Provides an example or case study of
    DEFINES = "DEFINES"                       # Establishes the meaning or scope of
    
    # Contrast & Conflict
    OPPOSES = "OPPOSES"                       # General opposition or conflict
    CONTRADICTS_CLAIM = "CONTRADICTS_CLAIM"   # Specifically contradicts a statement/claim (vs. KG CONTRADICTS fact)
    CHALLENGES_PREMISE_OF = "CHALLENGES_PREMISE_OF" # Questions underlying assumptions
    REFUTES = "REFUTES"                       # Argues against, disproves
    LIMITS = "LIMITS"                         # Sets boundaries or constraints on
    GENERATES_PARADOX_FROM = "GENERATES_PARADOX_FROM" # Creates a paradoxical situation from
    RESOLVES_TENSION_BETWEEN = "RESOLVES_TENSION_BETWEEN" # Offers a resolution to a conflict/tension
    
    # Causality & Influence (User Perspective)
    ENABLES = "ENABLES"                       # Makes possible or facilitates
    CAUSES = "CAUSES"                         # Direct causal link (as interpreted by user)
    INFLUENCES = "INFLUENCES"                 # General influence (user interpretation, distinct from KG INFLUENCED_BY)
    AMPLIFIES = "AMPLIFIES"                   # Strengthens or intensifies
    REDUCES_TO = "REDUCES_TO"                 # Simplifies or boils down to
    DERIVES_FROM = "DERIVES_FROM"             # User-asserted derivation
    
    # Structure & Composition
    IS_COMPONENT_OF = "IS_COMPONENT_OF"       # User-defined part-whole relationship
    IS_AXIOM_FOR = "IS_AXIOM_FOR"             # User identifies something as axiomatic for another
    SYMBOLIZES = "SYMBOLIZES"                 # User interprets something as symbolic of another
    
    # Generic / Default
    RELATED_TO = "RELATED_TO"                 # Default, less specific relationship
    # Add other user-facing semantic relationships from the plan 