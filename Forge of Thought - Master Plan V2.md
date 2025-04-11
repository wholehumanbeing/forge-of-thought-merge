# FORGE_OF_THOUGHT_PLAN_V2.md

**(Version 2.1 - Integrating Deeper Vision & Workflow Refinements)**

## V2 Alignment Verdict & Refinements

This V2 Master Plan aligns directly with the core conceptual breakthroughs discussed, shifting the focus from static representation to dynamic hypothesis and invocation ("Edges as Hypotheses"). It canonizes the **Twelve Alchemical Edges** and integrates the "Ritual UX" philosophy functionally.

**Key Alignments:**

*   **Edges as Hypotheses:** The V2 interaction flow (temp line -> suggest -> select -> confirm) is central.
*   **Twelve Alchemical Edges:** Embedded as the canonical `SemanticEdgeType` enum.
*   **Ritual UX:** Translated into specific UI behaviors, visual styles, and feedback mechanisms.
*   **Phased Roadmap:** Prioritizes stabilization before implementing advanced V2 features.

**Minor Refinements Incorporated into V2 Plan Sections:**

*   **Semantic Field Dynamics:** Explicitly mentioned for refinement within `SuggestionService` (Section VI.B) and potentially KI node metadata. Node types will map to semantic fields (Symbolic, Causal, etc.) to weight edge suggestions.
*   **Synthesis Prompt Clarity:** Section VI.B (`SynthesisCore`) updated to emphasize that each of the 12 Edges maps to specific prompt modifications/templates, weighted by context. (The prompt modifier table in Section IV provides the specifics).
*   **Lineage Mapper & Symbolism:** Section VI.B (`LineageMapper`) updated to ensure KI queries specifically look for `ARCHETYPE`, `MYTH`, and `SYMBOL` nodes in the ancestry trace, surfacing these in the `LineageReport`.

---

## I. Core Vision & V2 Philosophy (Recap & Refinement)

*   **Goal:** An engine for "epistemic alchemy" – generating novel insights via visual conceptual structuring. **This serves as the foundation for the ultimate aim: a personalized environment for mapping, navigating, and catalyzing self-understanding and transformation.**
*   **V1 Foundation:** The existing codebase provides a skeleton (React Flow FE, FastAPI BE, KI Interfaces, basic Synthesis/Lineage stubs/implementations).
*   **V2 Shift:** Move from treating the graph as *representation* to treating it as **active hypothesis and invocation**. The focus shifts to **tension, emergence, and semantic dynamics** as pathways to insight.
*   **Core Principle V2:** **Edges are Semantic Gestures/Hypotheses.** The user signals *interest* or *potential* relationship using one of the **Twelve Alchemical Edges**; the system responds contextually, synthesizing meaning based on that specific, intentional gesture.
*   **Interaction Goal:** A "Ritual Ground" UI facilitating a *dialogue* between user intention and system synthesis, making interaction feel meaningful, consequential, **and eventually, intuitive enough to map the flow of lived experience.**

---

## II. Architecture Overview (Confirmed via Diagnostic)

*   **Frontend:** React/Vite, TypeScript, React Flow, Zustand (complex state), Framer Motion, Axios.
*   **Backend:** Python/FastAPI, Pydantic, Uvicorn.
*   **Knowledge Infrastructure (KI):** Neo4j (via `neo4j` driver), ChromaDB (via `chromadb-client`). Interfaces (`knowledge_graph_interface.py`, `vector_db_interface.py`) are substantially implemented.
*   **LLM:** OpenAI (via `openai` library in `llm_client.py`). Requires API key configuration.
*   **Services:** `SynthesisCore`, `LineageMapper`, `SuggestionService` contain significant logic but require alignment and testing.
*   **APIs:** Routers exist for concepts, onboarding, synthesis, suggestions. Need interface alignment verification.

---

## III. Definitive Data Models & Ontology (V2 - Target State)

*(This section defines the *target* state for V2 and beyond. Implementation involves refining existing models and potentially adding placeholders for future types.)*

### A. Node Types (`NodeType` Enum in `ki_ontology.py` / `frontend/src/types/api.ts`)

*   **Core Conceptual Types:** `CONCEPT`, `THINKER`, `WORK` (includes Theory, Text), `SCHOOL_OF_THOUGHT`, `HISTORICAL_CONTEXT` (Epoch, Event), `FIELD_OF_STUDY`.
*   **V2 Symbolic Types:** `ARCHETYPE`, `MYTH`, `SYMBOL`.
*   **V2 Structural/Internal:** `AXIOM`, `METAPHOR`, `PARADOX` (if represented as nodes), `SYNTHESIS` (for generated nodes).
*   **Target Personal Integration Types (for future phases):** `LifeEvent`, `Feeling`, `Preference`, `Belief`, `Person`, `RelationshipDynamic`, `Pattern` (identified bias/theme), `Insight` (user-validated).
*   ***Action:*** Review/update existing enums in backend/frontend to match the Core, Symbolic, and Structural types for V2. Add the Personal Integration types as placeholders or comments in the ontology definition to guide future development towards the self-understanding engine.

### B. The Twelve Semantic Edges (`SemanticEdgeType` Enum)

*   This is the **definitive** set for **user interaction** on the canvas, representing **cognitive/semantic operators**.
*   **Members:** `IS`, `HAS`, `DEPENDS_ON`, `CONTRASTS_WITH`, `CONFLICTS_WITH`, `IMPLIES`, `EMERGES_FROM`, `TRANSFORMS_INTO`, `ALIGNS_WITH`, `SYMBOLIZES`, `CONTAINS_TENSION_WITHIN`, `SEEKS`.
*   ***Action:*** Ensure this Enum exists and is correctly defined in backend/frontend. Update constants/UI elements.

### C. KG Relationship Types (`RelationshipType` Enum)

*   For **internal Neo4j structure**, representing **documented/factual links** derived from ingested data or previous syntheses. Includes: `SUBCLASS_OF`, `INSTANCE_OF`, `PART_OF`, `INFLUENCED_BY`, `DISCUSSED_BY`, `CONTRADICTS` (factual), `SYMBOLIZES` (factual), `USES_METAPHOR`, `BASED_ON_AXIOM`, `DERIVED_FROM`, `PRECEDES`, `RELATED_TO` (generic), **`INVOLVED_IN_EVENT`**, **`HELD_BELIEF_AT_TIME`**, **`FELT_AT_TIME`**.
*   ***Action:*** Review/update existing Enum in backend. Ensure clear distinction from `SemanticEdgeType` in code and logic (e.g., `LineageMapper` uses `RelationshipType`, `SynthesisCore` primarily interprets `SemanticEdgeType`). Add relationship types needed for personal data integration.

### D. Core Pydantic Models (`data_models.py`) & TypeScript Types (`types/api.ts`)

*   **`NodeData`**: Fields: `id: str`, `type: NodeType`, `label: str`, `data: Dict[str, Any]` (must include `description: Optional[str]`, `position: {x: float, y: float}`, potentially `core_glow_state: Optional[str]`, `user_notes: Optional[str]`, **`timestamp: Optional[datetime]` for time-sensitive nodes like `Feeling`, `LifeEvent`**), `ki_id: Optional[str]`.
*   **`EdgeData`**: Fields: `id: str`, `source: str`, `target: str`, `semantic_type: Optional[SemanticEdgeType]` (User-defined hypothesis/operator for synthesis input), `internal_type: Optional[RelationshipType]` (Documented KG link, potentially used for context/lineage, distinct from semantic_type), `data: Optional[Dict[str, Any]]`. ***Clarification:*** The `semantic_type` is the primary driver for the user-invoked synthesis prompt. The `internal_type` might be retrieved from the KG for context but isn't set directly by the user during the hypothesis flow.
*   **`GraphStructure`**: Fields: `nodes: List[NodeData]`, `edges: List[EdgeData]`. ***Action:*** **Fix the frontend/backend payload mismatch for `edges` (source/target naming).** (High Priority Fix).
*   *(Other models like `SynthesisOutput`, `LineageReport`, `SynthesisResult`, `NodeContext` remain largely the same, ensure `LineageReport` can handle personal node types)*.
*   ***Action:*** Carefully review and refactor models/types for consistency. Add `timestamp` to `NodeData`. Clarify `semantic_type` vs `internal_type` role in `EdgeData` documentation/comments.

---

## IV. Semantic Engine Reference Tables

### A. 🔥 Alchemical Edge Reference & Cognitive Mapping

| 🔥 Alchemical Edge        | 🧬 Category                       | 🧠 Cognitive Role                           |
| :------------------------ | :-------------------------------- | :------------------------------------------ |
| `IS`                      | Logical / Structural              | Ontological anchor                          |
| `HAS`                     | Logical / Structural              | Attribute/partitive reasoning               |
| `DEPENDS_ON`              | Causal / Temporal                 | Contextual asymmetry / necessity            |
| `CONTRASTS_WITH`          | Tensional / Dialectical           | Comparative contrast / tension generation   |
| `CONFLICTS_WITH`          | Normative / Logical               | Contradiction, dissonance, deadlock         |
| `IMPLIES`                 | Logical / Inferential             | Deductive or teleological consequence       |
| `EMERGES_FROM`            | Causal / Temporal                 | Emergence, complexity, system dynamics      |
| `TRANSFORMS_INTO`         | Causal / Ontological / Temporal   | Change over time, morphogenesis             |
| `ALIGNS_WITH`             | Integrative / Normative           | Resonance, coherence, shared structure      |
| `SYMBOLIZES`              | Symbolic / Metaphorical           | Cross-domain mapping, metaphor              |
| `CONTAINS_TENSION_WITHIN` | Tensional / Reflexive             | Internal contradiction, dialectic interior  |
| `SEEKS`                   | Normative / Teleological          | Goal-state, desire, purpose-mapping         |

### B. 🧲 Graph Dynamics Components (Conceptual Model for V2+ Implementation)

| Component         | Description                                                                                                                       |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Edge Tension**    | Each edge carries a “tension weight” based on semantic distance or conflicting node fields. Affects synthesis & suggestions.        |
| **Field Overlap**   | Nodes have semantic field tags (Symbolic, Causal, etc.). Overlapping fields between connected nodes increases synthesis "heat."   |
| **Resonance**       | Clusters of nodes with similar alignments create "field reinforcement," highlighting potential insight areas.                   |
| **Collapse Trigger**| High density of `CONFLICTS_WITH`/`CONTRASTS_WITH` edges prompts user ("Unresolved tension. Forge?").                             |
| **Fork Points**     | Nodes with multiple diverging edge types (e.g., `ALIGNS_WITH` & `CONFLICTS_WITH` to same target) prompts user ("Split path?").     |

### C. 🧠 Interpretive Layer: Edge Function, Prompting, and UI Ideas

| #  | Edge                      | Cognitive Function                | Prompt Behavior                                  | UI Idea                             | Notes                                           |
| :- | :------------------------ | :-------------------------------- | :----------------------------------------------- | :---------------------------------- | :---------------------------------------------- |
| 1  | `IS`                      | Ontological grounding             | Treat B as category/identity for A.            | Solid line, no arrow                | Safest & most dangerous edge.                   |
| 2  | `HAS`                     | Structural containment            | Decompose A into B / Use B for A's anatomy.    | Dashed line, embedded dot           | Attributes, nested concepts.                    |
| 3  | `DEPENDS_ON`              | Contextual asymmetry / necessity  | Treat B as prerequisite context for A.           | Arrow with circle base              | Creates epistemic gravity.                      |
| 4  | `CONTRASTS_WITH`          | Dialectical tension / difference  | Ask difference A/B; Suggest paradox.           | Wavy line, dark grey                | Generative tension, not war.                    |
| 5  | `CONFLICTS_WITH`          | Logical contradiction             | Trigger adversarial reasoning; Find conflict.    | Red line, jagged stroke             | LLM "fight or flight."                          |
| 6  | `IMPLIES`                 | Inference / consequence           | Infer B from A; Suggest downstream effects.    | Arrow with triangle tip             | Build chains of unfolding.                      |
| 7  | `EMERGES_FROM`            | Nonlinear genesis / complexity    | Prompt emergence metaphor; Find hidden systems.  | Spiral glyph on edge                | Science, myth, mind.                            |
| 8  | `TRANSFORMS_INTO`         | Ontological morphing / state change | Prompt evolution; How A becomes B.             | Morphing arrow (blurred)            | Becoming, not just motion.                      |
| 9  | `ALIGNS_WITH`             | Resonance / coherence             | Compare A/B principles; Generate analogies.    | Dual lines merging                  | Cross-cultural synthesis.                       |
| 10 | `SYMBOLIZES`              | Metaphor / mythic binding         | Prompt metaphor; B symbolic of A.              | Icon overlay (eye, star, glyph)     | Portal between domains.                         |
| 11 | `CONTAINS_TENSION_WITHIN` | Internal contradiction / duality  | Prompt internal conflict; Split A's self.      | Loop inside node, cracked icon      | Introspective synthesis.                        |
| 12 | `SEEKS`                   | Teleological vector / desire      | Animate A with intent toward B; Map goal.      | Dashed arrow pointing past B        | Makes the graph move.                           |

### D. 🧬 Synthesis Prompt Modifiers (Edge → LLM Instruction Mapping)

*(To be implemented within `SynthesisCore._construct_llm_prompt`)*

| Edge                      | Synthesis Prompt Modifier Stem                                    |
| :------------------------ | :---------------------------------------------------------------- |
| `IS`                      | “Define A in terms of B.”                                         |
| `HAS`                     | “What structures or parts does A contain related to B?”           |
| `DEPENDS_ON`              | “Explain why A cannot exist or function without B.”               |
| `CONTRASTS_WITH`          | “Describe the core tension or paradoxical relationship between A and B.” |
| `CONFLICTS_WITH`          | “Explore the logical or ethical contradiction between A and B. Can it be resolved?” |
| `IMPLIES`                 | “What necessary consequences or downstream ideas follow if A implies B?” |
| `EMERGES_FROM`            | “Explain the process or dynamics by which A arises non-linearly from B.” |
| `TRANSFORMS_INTO`         | “Describe the qualitative change or metamorphosis as A becomes B.” |
| `ALIGNS_WITH`             | “Identify and articulate the shared principles, patterns, or resonances between A and B.” |
| `SYMBOLIZES`              | “Construct a rich metaphorical or symbolic link where B represents A across domains.” |
| `CONTAINS_TENSION_WITHIN` | “Analyze the internal conflict, paradox, or duality inherent within A itself.” |
| `SEEKS`                   | “Frame A as having an intention or drive towards B as its goal or purpose.” |

---

## V. Core Interaction Flow (V2 - Edges as Hypotheses)

1.  **Node Placement:** User adds nodes (conceptual, symbolic, **or eventually personal**).
2.  **Edge Gesture (Hypothesis):** User draws a line between Node A and Node B (signals potential connection). Temporary line appears.
3.  **Contextual Suggestion:** System analyzes A, B (types, KI context, semantic fields, **temporal proximity if applicable**).
4.  **Suggestion Modal:** `RelationshipSelectorModal` opens, presenting ranked, relevant **Alchemical Edges** (from the 12 `SemanticEdgeType`s). Includes descriptions.
5.  **Edge Invocation (Selection):** User selects one of the 12 specific `SemanticEdgeType`s, making an **explicit semantic hypothesis** ("Explore this connection *as if* it `CONFLICTS_WITH`...").
6.  **Edge Confirmation:** Modal closes; edge state updates with selected `semantic_type`; visual rendering updates. **Note:** This confirms the *user's hypothesis/invocation edge*, distinct from potentially pre-existing *internal* `RelationshipType` links in the KG.
7.  **Optional Immediate Feedback:** *(Future Phase)*
8.  **Invoke Synthesis:** User selects subgraph, triggers "Ignite Synthesis." Backend uses `GraphStructure` (nodes + edges **with their user-assigned `semantic_type`s**) to drive `SynthesisCore`.
9.  **Revelation:** `SynthesisOutput` and `LineageReport` are returned. `SynthesisNode` appears. `Lineage` nodes/links fade in.
10. **Iteration:** User interacts with new nodes/lineage, Forking or Recursion.
11. ***Workflow Note:*** *While this NodeA->NodeB->Edge flow is the V2 target for implementation and testing, the user's intuition about alternative entry points (starting with a feeling, tension, or free-form text) is valid. Exploration of these alternative interaction modes is a potential refinement after the core loop is stabilized and validated.*

---

## VI. Key Components & V2 Enhancements (Informed by Diagnostic)

### A. Backend KI Interfaces (`db/`)

*   **V2 Needs:** Ensure methods can handle queries involving **new personal node/relationship types** and **timestamps** effectively. Robustness and testing remain key.

### B. Backend Services (`services/`)

*   **`SuggestionService`:**
    *   *V2 Needs:* Refine logic to handle **personal node types** and suggest relevant Alchemical Edges. Fix API payload inconsistency.
*   **`SynthesisCore`:**
    *   *V2 Needs:* Refactor `_construct_llm_prompt` to use the 12 Edges (Table IV.D). Implement field-aware reasoning. **Future Evolution:** Adapt synthesis logic to handle connections involving personal data nodes (`Feeling`, `LifeEvent`) and leverage insights from specialized agents (Phase 6 goal).
*   **`LineageMapper`:**
    *   *V2 Needs:* Ensure `trace_lineage` includes symbolic types. **Future Evolution:** Adapt to trace lineage through personal event/belief chains.

### C. Backend API Endpoints (`api/endpoints/`)

*   **V2 Needs:** **Fix `POST /synthesis/` payload validation** (Critical). Fix `POST /suggestions/edges` payload expectation. Ensure V2 model usage. Add OpenAPI docs.

### D. Backend Core (`core/`)

*   **V2 Needs:** **Add `OPENAI_API_KEY` config.**

### E. Frontend State (`store/canvasStore.ts`)

*   **V2 Needs:** **Stabilization first.** Refactor/simplify if needed. Ensure state can accommodate personal node types and timestamps later.

### F. Frontend Canvas (`pages/CanvasPage.tsx`)

*   **V2 Needs:** **Stabilization first.** Implement V2 Hypothesis flow for `onConnect`. Prepare for rendering diverse node types.

### G. Frontend Node/Edge Components

*   **V2 Needs:** Stabilize `KnowledgeNode`. Implement rendering for all V2 node/edge types, including visual state indicators (glows).

### H. Other Frontend Components

*   **V2 Needs:** Update `RelationshipSelectorModal` (12 Edges). Update `InspectorPanel` (context/lineage).

---

## VII. Knowledge Infrastructure (Wellspring - V2)

*   **Neo4j / ChromaDB:** Require population matching V2 ontology (including placeholders for personal types). Need indexing.
*   **Population Scripts (`scripts/`):** Use the JSON seed data for initial conceptual population. **Future Evolution:** Develop mechanisms for ingesting user-specific personal data (journal import, manual entry forms, integrations).

---

## VIII. UI Design Specification (The Ritual Interface V2)

### A. Design Philosophy

*   The interface is a **Ritual Ground / Alchemical Workbench / Scrying Mirror**.
*   Interactions are **intentional, symbolically meaningful gestures**, not just clicks.
*   The UI **responds dynamically** to semantic context (tension, resonance, potential).
*   Visual design supports **depth, emergence, contradiction, resonance, transformation**.

### B. Visual Style: “Alchemical Workbench Meets Cosmic Whiteboard”

| Feature           | Design Notes                                                                                           |
| :---------------- | :----------------------------------------------------------------------------------------------------- |
| Canvas Background | Deep indigo/charcoal (#0A0814); subtle, blurred background nebulae textures or faint etched geometry.     |
| Ambient Depth     | Soft radial light vignette towards center; edges darker. Feels like looking into focused depth.          |
| Font              | Clean sans-serif (e.g., Inter). Light gray/off-white (#EEEEEE). Good contrast.                             |
| Accent Palette    | Soft, muted neons/celestial tones (cyan, violet, amber, gold, silver) for glows & dynamic edge styles. |

### C. Nodes: Semantic Artifacts with Internal State

| Node Type           | Shape          | Texture / Finish          | Inner Core Glow States (Idle -> Selected -> Synthesis Input -> Forged Output) | Notes                                         |
| :------------------ | :------------- | :------------------------ | :-------------------------------------------------------------------------- | :-------------------------------------------- |
| **Core Concept**    | Circle         | Obsidian / Quartz         | Cool Blue/Purple -> Bright White/Cyan -> Pulsing Amber/Gold -> (N/A)        | Base unit of thought.                         |
| **Axiom/Principle** | Triangle       | Dark Bronze / Metallic    | Cool Blue -> Bright White -> Pulsing Amber -> (N/A)                         | Foundational elements.                        |
| **Thinker/Agent**   | Square         | Smooth Stone / Matte Metal| Muted Violet -> Bright White -> Pulsing Amber -> (N/A)                      | Anchors for lineage.                          |
| **Archetype/Symbol**| Custom Glyph   | Etched / Subtle Aura      | Deep Indigo -> Bright Cyan -> (N/A) -> (N/A)                                | Connects to symbolic layer.                 |
| **Synthesis Output**| Starburst/Sigil| Radiant / Crystalline     | (N/A) -> Bright White -> (N/A) -> **Radiant White-Gold/Iridescent**         | The "Forged" concept. Visually distinct.    |
| *(Other types)*   | *Consistent geometries* | *Subtle variations* | *Follow pattern: Cool Idle -> Bright Selected -> Warm Input*                | Maintain consistency.                         |

*Labels:* Clean sans-serif, below or inside node, high contrast.

### D. Edges: Dynamic Semantic Conduits

*(Styles based on Table IV.C)*

| SemanticEdgeType      | Line Style & Animation                                   | Color Guideline     |
| :-------------------- | :------------------------------------------------------- | :------------------ |
| `IS`                  | Solid line, no arrow                                     | Muted Gray/Silver   |
| `HAS`                 | Dashed line, embedded dot                                | Muted Gray/Silver   |
| `DEPENDS_ON`          | Arrow with circle base                                   | Subdued Blue/Gray   |
| `CONTRASTS_WITH`      | Wavy line                                                | Dark Gray/Indigo    |
| `CONFLICTS_WITH`      | Jagged / Crackling stroke                                | Muted Red/Orange    |
| `IMPLIES`             | Arrow with triangle tip                                  | Cyan/Light Blue     |
| `EMERGES_FROM`        | Spiral glyph overlay or slightly swirling line           | Green/Aqua          |
| `TRANSFORMS_INTO`     | Morphing/Blurred arrow or ripple effect                  | Violet/Magenta      |
| `ALIGNS_WITH`         | Dual lines merging into one                              | Gold/Yellow         |
| `SYMBOLIZES`          | Shimmering line, subtle particle drift, icon overlay     | Bright Cyan/Magenta |
| `CONTAINS_TENSION...` | Looping line *inside* node source, potential crack overlay | Dark Red            |
| `SEEKS`               | Dashed arrow, subtle trail effect                        | Amber/Orange        |
| **Temp Connection**   | Thin, bright white dashed line                           | White               |

*Creation Feedback:* Connection points briefly spark/pulse on successful typed connection.

### E. Toolbars & Interaction Icons (Symbolic Minimalism)

| Action            | Icon Concept                          | Label Suggestion       |
| :---------------- | :------------------------------------ | :--------------------- |
| Add Node          | Minimal geometric shape (circle/glyph)| Add Concept            |
| Connect Nodes     | Two orbs joined by arc                | Link Ideas             |
| Label Edge        | Small tag or sigil icon               | Define Relationship    |
| **Invoke Synthesis**| Crucible / Flame / Alembic Symbol     | **Ignite Synthesis** |

### F. Dynamic Ritual Feedback & Animations

| Event                 | Feedback                                                                                   |
| :-------------------- | :----------------------------------------------------------------------------------------- |
| Place Node            | Soft "thud" sound; brief ground ripple/glow animation.                                       |
| Draw Edge (Gesture)   | Temporary connection line appears; subtle dimming of canvas background; Modal animates open. |
| Select Edge Type      | Modal closes; Permanent edge animates in (style based on type); Connection points pulse.     |
| **Ignite Synthesis**  | Selected input nodes pulse with **Amber/Gold** core glow; Trigger sound (low hum/spark).     |
| **Reveal Synthesis**  | **Synthesis Node** appears with radiant animation/sound (chime/resonance); Lineage fades in. |
| Hover Node/Edge       | Subtle brightening or halo intensification.                                                  |
| Select Node/Edge      | Stronger glow/highlight; Inspector Panel animates open.                                    |
| Open/Close Panels     | Smooth slide/fade transitions (~200-300ms).                                                |

### G. Panels & Workspace (Alchemical Workbench)

*   **Inspector & Library Panels:** Dark, slightly textured metallic/stone background. Collapsible. Clear sections in Inspector (Core Info, KI Context, Lineage, Notes) with subtle dividers.
*   **Relationship Selector Modal:** Displays the 12 Edges, categorized, with evocative descriptions & visual previews (line style/glyph). Prioritizes contextually suggested types.

### H. Historical Lineage Display (Revelation Map V2)

*   **Layered Echoes:** Lineage nodes (Thinkers, Schools) render *behind* the main graph layer with reduced opacity/blur/desaturation.
*   **Subtle Links:** Thin, non-glowing gray lines connect lineage nodes to relevant synthesis/parent nodes.

### I. Avoidances

*   Literal alchemical apparatus clichés. Overly ornate/illegible sigils.
*   Bright, distracting backgrounds or particle effects. "Sci-fi dashboard" aesthetic.
*   Generic corporate whiteboard look. Cartoonish animations.

### J. Aesthetic Goal

*   A **thinking altar** or **scrying instrument**. Focused, deep, responsive.
*   Visually communicates semantic state (tension, resonance, potential).
*   Feels professional, unique, and intentionally designed for **cognitive alchemy**.

---

## IX. Revised Phased Development Roadmap (V2 & Beyond)

*(High-level phases; detailed steps follow the "Reference -> Verify -> Increment" model)*

*   **Phase 0: STABILIZATION (IMMEDIATE PRIORITY)**
    *   **Goal:** Fix critical bugs (loops, API mismatches - `GraphStructure`, `suggestions`). Configure API key. Ensure basic interactions are stable.
    *   ***Action:*** Execute Cursor prompts to fix identified issues (starting with Prompt #1 result validation).

*   **Phase 1: Core Hypothesis Loop & KI Seeding**
    *   **Goal:** Implement V2 "Edges as Hypotheses" interaction flow. Populate KG/ChromaDB using the seed scripts (JSON data). Implement node context display. Implement basic edge suggestions (fix API first).
    *   *Focus:* Frontend interaction logic, executing seed scripts, Backend `SuggestionService`/API fix.

*   **Phase 2: V2 Synthesis & Basic Revelation**
    *   **Goal:** Implement edge-driven prompting in `SynthesisCore` (using Table IV.D). Test end-to-end synthesis with seeded data. Render basic `SynthesisNode`.
    *   *Focus:* Backend `SynthesisCore` prompt logic, testing `POST /synthesis/`, basic `SynthesisNode` rendering.

*   **Phase 3: Deep Lineage & Full Revelation Map**
    *   **Goal:** Implement full `LineageMapper` (including symbolic tracing). Render full Revelation Map (lineage nodes/links). Enhance Inspector.
    *   *Focus:* Backend `LineageMapper`, advanced KG queries, Frontend rendering.

*   **Phase 4: Advanced Features & Ritual UX Polish**
    *   **Goal:** Implement Onboarding, Forking, Recursion. Apply full "Ritual Ground" UI/UX polish. Refine suggestions (field dynamics).
    *   *Focus:* Frontend features & aesthetics, Backend suggestion logic.

*   **Phase 5: Foundational Personal Integration**
    *   **Goal:** Define and implement core personal node types (`LifeEvent`, `Feeling`, `Belief`). Develop basic mechanisms for user data input (e.g., simple forms, journal importer). Adapt KI queries and basic synthesis to handle these types.
    *   *Focus:* Data modeling, backend ingestion logic, basic adaptation of services.

*   **Phase 6: Agentic Analysis & Self-Understanding Engine**
    *   **Goal:** Develop specialized reasoning agents (ArchetypeMapper, BiasDetector, Contextualizer). Implement complex synthesis connecting personal data to concepts/patterns (like the color example). Refine UI for navigating personal insights. Implement temporal visualization/state tracking.
    *   *Focus:* Advanced backend service development, multi-step synthesis logic, potentially new UI paradigms.

*   **Phase 7: Testing & Refinement**
    *   **Goal:** Comprehensive testing, performance optimization, user feedback integration (starting with self-testing).
    *   *Focus:* Test suites, profiling, iteration based on use.

---

## X. Verification & Iteration Strategy

*   **Reference V2 Plan:** Start every Cursor prompt with `@doc:FORGE_OF_THOUGHT_PLAN_V2.md`.
*   **Small, Focused Steps:** Break down tasks from the roadmap into single-purpose prompts targeting specific files/functions/bugs.
*   **Verify Each Step:** Manually test the specific change implemented by each prompt immediately. Fix bugs before proceeding to the next step. Check browser console and backend logs.
*   **Use Diagnostic/Debugging Prompts:** Leverage Cursor specifically to analyze errors ("Analyze this stack trace...", "Why might this state update cause a loop?") or review code ("Review this function against Section X.Y of the plan.").

---