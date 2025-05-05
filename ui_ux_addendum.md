# UI / UX Addendum

## Quick-Fix Summary
1. **Node Label-Only Display** – KnowledgeNode now hides the description inside the node rectangle and exposes a right-click ℹ️ modal with description plus stubbed lineage lists.
2. **Edge-Type Modal Restyle** – RelationshipSelectorModal gets rounded corners, dark-theme friendly colours, and smaller padding.
3. **Auto-Synthesis**
   • When an edge type is confirmed in the modal, synthesis runs automatically in the background.
   • Clicking any edge (including its label) also re-triggers synthesis.
4. **Removed Legacy "Synthesize Selected" Button** – canvas declutters; Open Library FAB no longer overlaps anything.

## 3-D Canvas Evolution (2-Paragraph Roadmap)
A pragmatic first step toward depth is a 2.5-D parallax effect: give every node a deterministic `z-index` and apply `transform: translateZ()` with CSS perspective on the React-Flow wrapper. A lightweight hook can map node type or creation order to depth, updating on pan/zoom to create subtle parallax without new libraries. This preserves the existing React-Flow graph logic and keeps performance high.

For full 3-D orbit/rotation, the recommended path is **React-Three-Fiber** (R3F). It allows treating each node as a mesh in a Three.js scene while re-using React declarative patterns. We can progressively migrate: render the current 2-D graph in an R3F `<Canvas>` using HTML overlays (via `@react-three/drei/html`), then incrementally replace edges with Three.js lines and nodes with textured planes/meshes. This phased approach avoids a big-bang rewrite and lets us keep Zustand store + backend contracts intact.

## File-Splitting Opinion
InspectorPanel.tsx (~400 LOC) and synthesis_core.py (~1 600 LOC) remain the largest pain points. However, for this UI push we avoided structural churn to keep the diff minimal. Post-MVP, splitting InspectorPanel into presentation vs. data hooks (≈150 LOC each) and moving synthesis_core's KI-query helpers into a `/services/ki/` sub-package will significantly improve maintainability.

---
*Generated automatically as part of the MVP UI/UX patch.* 