# Forge of Thought – Master Plan V3
A pragmatic, Cursor‑ready roadmap for shipping a demonstrable MVP of intuitive knowledge‑mapping.

# 0 · Guiding North Star

**MVP success** = a user can add two concepts, connect them with an “Alchemical Edge”, request synthesis, and see a new node appear – all without console or backend errors.

Everything below serves that single outcome. Later ambitions (personal ontology, 3‑D UI, agent swarms) are deferred until the MVP is in hand.

# 1 · Reset & Critical Fixes (day 0)

* **1.1 Replace default‑import of logger with named‑import**
    * **Deliverable:** FE builds & canvas loads
    * **Primary files:** `frontend/src/store/canvasStore.ts`, `frontend/src/utils/logger.ts`
* **1.2 Delete or merge duplicates (backend/api.ts, extra chroma_data/, duplicate seed scripts)**
    * **Deliverable:** Clean git status—no orphan files
    * **Primary files:** whole repo
* **1.3 Ensure .env variables exist for OPENAI_API_KEY, Neo4j & ChromaDB URIs**
    * **Deliverable:** Backend boots with uvicorn
    * **Primary files:** `backend/app/core/config.py`, `.env.example`
* **1.4 Add npm run lint (ESLint + Prettier) & ruff + black pre‑commit**
    * **Deliverable:** Passing linters locally
    * **Primary files:** `frontend/package.json`, `pyproject.toml`
* **1.5 README.md quick‑start updated to three commands: seed, start‑be, start‑fe**
    * **Deliverable:** New dev can run project
    * **Primary files:** root `README.md`

**Rationale:** Without a clean boot and clear setup, every further step flounders.

# 2 · Model & API Alignment (day 1‑2)

* **2.1 Unify NodeData & EdgeData (backend Pydantic ↔︎ TS types). Source/target names must match.**
    * **Outcome:** No TypeScript → Python payload mismatch
    * **Files:** `backend/app/models/data_models.py`, `frontend/src/types/api.ts`
* **2.2 Clarify dual edge fields: semantic_type (user) vs internal_type (KG). Document inline.**
    * **Outcome:** Future devs avoid confusion
    * **Files:** same as 2.1
* **2.3 Add minimal OpenAPI examples for POST /edges and POST /synthesis**
    * **Outcome:** Swagger shows exact request shapes
    * **Files:** `backend/app/api/endpoints/concepts.py`, `synthesis.py`
* **2.4 Write a failing pytest for /synthesis happy‑path (seed → call → 200)**
    * **Outcome:** Red bar for TDD loop
    * **Files:** `backend/tests/test_synthesis.py`

**Rationale:** Cursor can only reason about what’s explicit; strict schemas prevent silent type drift.

# 3 · Stabilise Frontend Canvas Core (day 3‑4)

* **3.1 Split canvasStore.ts into graphSlice (nodes/edges) & uiSlice (modals, inspector).**
    * **Outcome:** Easier atomic edits
    * **Files:** `frontend/src/store/…`
* **3.2 Replace hard‑coded test-node-with-ki with seeded lookup: on first load call /concepts/random -> add node.**
    * **Outcome:** Canvas works on any fresh DB
    * **Files:** `canvasStore.graphSlice.ts`, `backend/app/api/endpoints/concepts.py`
* **3.3 Implement temp edge → modal → edge commit flow for one edge type only: IS.**
    * **Outcome:** Proof of hypothesis UX works
    * **Files:** `canvasStore.uiSlice.ts`, `RelationshipSelectorModal.tsx`
* **3.4 Add Playwright test: “user draws IS edge between two nodes”.**
    * **Outcome:** Green E2E check
    * **Files:** `frontend/tests/edge_hypothesis.spec.ts`

**Rationale:** One edge type is enough to validate the full loop; others can be styled later.

# 4 · Minimal Synthesis Loop (day 5‑7)

* **4.1 In SynthesisCore, accept graph payload, ignore edge semantics for now, and prompt LLM with: “Give a single synthesized concept that bridges A and B”.**
    * **Outcome:** Returns `{label, description}` JSON
    * **Files:** `backend/app/services/synthesis_core.py`
* **4.2 Backend inserts new node in Neo4j, returns node data.**
    * **Outcome:** Data persistence
    * **Files:** `knowledge_graph_interface.py`
* **4.3 Frontend receives node → adds to canvas with light “synthesis” style.**
    * **Outcome:** Visible new concept
    * **Files:** `canvasStore.graphSlice.ts`
* **4.4 Expand Playwright test: after synthesis, new node count = 3.**
    * **Outcome:** Automated regression
    * **Files:** same test file

**Rationale:** Even a trivial bridge proves full-stack flow and unlocks demos.

# 5 · Edge Semantics & Suggestion Service (week 2)

* **5.1 Implement the 12‑enum SemanticEdgeType on FE/BE; add icon & color tokens (no animation yet).**
    * **Outcome:** Visual variety
    * **Files:** `constants/edgeTypes.ts`, `backend/app/models/enums.py`
* **5.2 SuggestionService returns top‑3 edge types for any node pair using simple heuristic (string similarity + random weight).**
    * **Outcome:** Modal pre‑selects suggestions
    * **Files:** `backend/app/services/suggestion_service.py`
* **5.3 Extend synthesis prompt map (Table IV.D V2) but keep logic table‑driven for maintainability.**
    * **Outcome:** Edge‑aware outputs
    * **Files:** `synthesis_core.py`
* **5.4 Add unit tests for prompt selection per edge.**
    * **Outcome:** 12 passing tests
    * **Files:** `backend/tests/test_prompt_map.py`

**Rationale:** Semantic richness comes with controlled complexity—keep heuristics simple first.

# 6 · Technical Health Sprint (parallel, week 2)

* **6.1 Dockerise: docker-compose up starts FE, BE, Neo4j, ChromaDB.**
    * **Outcome:** On‑boarding in 1 command
    * **Files:** `Dockerfile*`, `docker-compose.yml`
* **6.2 GitHub Action: lint → test → docker build.**
    * **Outcome:** CI green light
    * **Files:** `.github/workflows/ci.yml`
* **6.3 Add simple error toast component and catch all Axios failures.**
    * **Outcome:** User sees why things break
    * **Files:** `frontend/src/components/Toast.tsx`, `services/api.ts`
* **6.4 Enable Neo4j uniqueness constraints on node ki_id.**
    * **Outcome:** Prevent dupes
    * **Files:** `populate_neo4j.py`

# 7 · Polish & Demo Cut (week 3)

* Node & Edge Styling Pass – apply colors/line styles from V2 tables; keep animations off to avoid perf tax.
* Inspector Panel v1 – show node description, incoming/outgoing edge counts, last‑LLM stamp.
* Record 60‑sec Loom – cold start, create two nodes, link, synthesize, refresh browser to show persistence.

# 8 · Post‑MVP Parking Lot (de‑risked for later)

* Personal ontology nodes (LifeEvent, Feeling).
* Field‑tension heat‑map & lineage ghosting.
* Multi‑agent analysis swarm.
* 3‑D spatial canvas or VR mode.

# 9 · Cursor‑Execution Conventions

* Start every prompt with `@doc:instructions.md` so Cursor reads this plan.
* For any step touching a single file, reference it directly:
    `@file:frontend/src/store/graphSlice.ts` – write unit test for `addNode`
* When a change spans >1 file, create separate prompts per file to keep commit diff small.
* After each green test, commit with message `feat: step X.Y – <summary>`.

# 10 · Timeline Recap

| Phase          | Target days | Output                            |
|----------------|-------------|-----------------------------------|
| 1 Reset        | 0‑1         | App boots                         |
| 2 Model sync   | 1‑2         | Passing pytest + Swagger          |
| 3 Canvas core  | 3‑4         | Edge‑modal works                  |
| 4 Synthesis MVP| 5‑7         | Node‑bridge appears               |
| 5 Edge semantics| 8‑12        | 12 edges styled + edge‑aware prompts |
| 6 Tech health  | parallel    | CI, Docker, toasts                |
| 7 Polish & demo| 13‑15       | Shareable video                   |

Strict, linear, and test‑gated—no circles.

