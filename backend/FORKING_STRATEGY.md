# Backend Forking Strategy

This document outlines the backend architecture considerations and strategy for implementing graph forking functionality in the Forge of Thought application.

## Goal

Allow users to create independent copies (forks) of the canvas state, starting from a specific point (likely a Synthesis Node), enabling divergent exploration of ideas without affecting the original graph.

## Current State & Challenges

- **State Management:** The current assumption is that the frontend might send the entire graph state (nodes and edges) for operations like synthesis. Persistence might be limited or rely on simple storage of the latest state (e.g., in browser localStorage or a single database entry per user/session).
- **Persistence:** A robust forking mechanism requires persistent storage of multiple, distinct graph states associated with a user or session.
- **Identity:** Forked graphs need unique identifiers, while also retaining a link to their parent graph and the specific node/state they were forked from.

## Forking Approaches Considered

### Option A: Full Copy

- **Mechanism:** When a user initiates a fork from a specific graph state 'G' (potentially associated with a Synthesis Node 'S'):
    1.  Create a complete, deep copy of the entire graph state 'G' (all nodes and edges present at that moment) in the backend data store.
    2.  Assign a new unique identifier to this copied graph state ('G-fork-1').
    3.  Store metadata linking 'G-fork-1' back to its parent 'G' and optionally the node 'S' it was forked from.
    4.  Subsequent user interactions on the fork modify only 'G-fork-1'.
- **Pros:**
    - **Simplicity:** Relatively straightforward to implement. Logic involves copying data structures.
    - **Isolation:** Forks are completely independent, reducing the risk of unintended side effects between branches.
    - **Read Performance:** Loading a specific fork is fast as it involves retrieving a single, complete graph state document/record.
- **Cons:**
    - **Storage Inefficiency:** Can consume significant storage space, especially with large graphs and frequent forking, as much data is duplicated.
    - **History Tracking:** Merging or complex diffing between forks becomes difficult as there's no inherent shared history mechanism beyond the initial parent link.

### Option B: Diff/Version Control (e.g., Git-like)

- **Mechanism:**
    1.  Treat each graph state save as a commit or version.
    2.  Use a version control system approach (conceptually similar to Git).
    3.  Forking creates a new branch pointer that initially points to the same commit as the parent branch.
    4.  Edits on the fork create new commits *only on that branch*. These commits might store the full state at that point or just the differences (diffs/deltas) from the parent commit.
- **Pros:**
    - **Storage Efficiency:** Significantly more storage-efficient, especially if using diffs, as only changes are stored.
    - **Rich History:** Provides a clear history of changes and relationships between different graph states.
    - **Advanced Operations:** Enables more complex operations like merging branches or viewing diffs between forks (though implementation is complex).
- **Cons:**
    - **Implementation Complexity:** Much harder to implement correctly. Requires careful design of the versioning system, diffing algorithms, and state reconstruction.
    - **Read Performance:** Loading a specific fork/version might require reconstructing the state by applying diffs sequentially, potentially impacting load times.

## Proposed API Changes

Regardless of the chosen approach, new API endpoints will be required:

- `POST /api/graphs/{graph_id}/fork`:
    - Creates a new fork from the specified `graph_id` (potentially requiring a `node_id` or `version_id` in the request body).
    - Returns the ID and initial state of the newly created fork.
- `GET /api/graphs/{graph_id}`:
    - Retrieves a specific graph state by its unique ID (could be an original graph or a fork).
- `PUT /api/graphs/{graph_id}`:
    - Saves/updates the state of a specific graph (original or fork).
- `GET /api/graphs`:
    - Lists available graphs/forks for the user, possibly showing relationships.

## Data Model Changes

- The backend storage schema needs to be updated:
    - **Graph State Table/Collection:** Store individual graph states (nodes, edges, potentially viewport info).
        - Each entry needs a unique `graph_id`.
        - Needs fields to link forks: `parent_graph_id`, `forked_from_node_id` (optional).
        - Timestamps (`created_at`, `updated_at`).
        - User association.
    - **(For Option B):** Additional tables/collections for commits, branches, and potentially diffs.

## Recommendation

For initial implementation, **Option A (Full Copy)** is recommended.

- **Reasoning:** The primary goal is to enable the core forking user experience. Option A achieves this with significantly lower implementation complexity and risk compared to Option B. The storage overhead is a reasonable trade-off for faster development and easier debugging initially.
- **Future:** Option B (Diff/Versioning) should be considered as a future optimization if storage costs become prohibitive or more advanced features like merging or detailed diffing between forks are required.

## Next Steps (Backend)

1.  Design the database schema changes to support storing multiple, named graph states with parent relationships.
2.  Implement the new API endpoints (`POST /fork`, `GET /graphs/{id}`, `PUT /graphs/{id}`, `GET /graphs`).
3.  Refactor existing services (e.g., synthesis) to operate on specific `graph_id`s passed from the frontend.
4.  Ensure user authentication/authorization correctly scopes access to graphs. 