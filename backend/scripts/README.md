# Knowledge Infrastructure (KI) Expansion Strategy

This document outlines the strategy for significantly expanding the Knowledge Infrastructure (KI) powering the Forge of Thought application. This includes both the Neo4j Knowledge Graph (KG) and the ChromaDB Vector Store.

## 1. Source Identification

Potential sources for concepts, definitions, and relationships include:

*   **Structured Knowledge Bases:**
    *   Wikidata dumps (filtered for relevant domains like philosophy, science, mythology, historical figures, works).
    *   Stanford Encyclopedia of Philosophy (SEP) - if structured export/API is available or via scraping (ethically and technically permissible).
    *   DBpedia.
    *   Academic ontologies (e.g., PhilOntos, specific scientific ontologies).
*   **Curated Lists & Text Corpora:**
    *   Curated lists of concepts, thinkers, schools, etc. (e.g., the initial list provided during development).
    *   Public domain philosophical and scientific texts (e.g., Project Gutenberg) for relationship extraction (requires advanced NLP).
    *   Specific academic papers or books provided in structured formats (CSV, JSON).
    *   Domain-specific encyclopedias or dictionaries (if licensing allows).
*   **User Contributions (Future):** A mechanism for users to suggest concepts and relationships, subject to curation.

Source selection requires careful vetting for quality, reliability, and alignment with the project's epistemic goals. Licensing and terms of use must be respected.

## 2. Schema Finalization

The target Knowledge Graph schema provides structure and meaning to the ingested data.

**Node Labels:**

*   `Concept`: Generic base label for abstract ideas.
    *   `PhilosophicalConcept`: Sub-label for concepts primarily within philosophy.
    *   `ScientificConcept`: Sub-label for concepts primarily within scientific domains.
    *   `Archetype`: Foundational patterns or symbols (e.g., Hero, Shadow).
    *   `Symbol`: Concrete representations of abstract ideas (e.g., Ouroboros, Tree of Life).
    *   `Myth`: Narrative structures embodying cultural or psychological truths.
*   `Thinker`: Individuals known for significant intellectual contributions (philosophers, scientists, artists).
*   `School`: Schools of thought, movements, or traditions (e.g., Stoicism, Existentialism, Empiricism).
*   `Work`: Specific books, essays, articles, artworks.
*   `Epoch`: Historical or cultural periods (e.g., Enlightenment, Axial Age).
*   `Synthesis`: Nodes created by the application's synthesis process.

**Relationship Types (Non-exhaustive):**

*   **Hierarchical/Taxonomic:**
    *   `IS_A`: Sub-concept/instance relationship (e.g., Stoicism `IS_A` School).
    *   `PART_OF`: Composition relationship (e.g., Concept `PART_OF` School).
*   **Influence/Derivation:**
    *   `INFLUENCED_BY`: (Thinker/School/Work `INFLUENCED_BY` Thinker/School/Work).
    *   `DERIVES_FROM`: (Concept/School `DERIVES_FROM` Concept/School).
*   **Conceptual Relationships:**
    *   `RELATES_TO`: Generic association.
    *   `SUPPORTS`: Concept A provides evidence/reasoning for Concept B.
    *   `CONTRADICTS`: Concept A is in opposition to Concept B.
    *   `IS_ANALOGOUS_TO`: Concept A shares structural similarity with Concept B.
    *   `USES_METAPHOR`: (Work/Thinker `USES_METAPHOR` Symbol/Concept).
    *   `IS_SYMBOL_FOR`: (Symbol `IS_SYMBOL_FOR` Concept/Archetype).
    *   `IS_EXAMPLE_OF`: Concrete instance illustrates an abstract concept.
*   **Axiomatic/Foundational:**
    *   `IS_AXIOM_FOR`: Foundational principle for another concept/school.
    *   `ASSUMES`: Concept/School implicitly relies on another concept.
*   **Temporal/Historical:**
    *   `PRECEDES`/`SUCCEEDS`: Temporal ordering (Epochs, Thinkers).
    *   `CONTEMPORARY_WITH`: Existed during the same period.
*   **Attribution:**
    *   `AUTHORED_BY`: (Work `AUTHORED_BY` Thinker).
    *   `ASSOCIATED_WITH`: (Concept/Thinker `ASSOCIATED_WITH` School/Epoch).

*Properties:* Nodes and Relationships will have properties like `name`, `description`, `source_url`, `ingestion_date`, `confidence_score` (for extracted relationships), `vector_id` (linking to ChromaDB).

## 3. Ingestion Scripts (`backend/scripts/`)

A suite of Python scripts will manage the ingestion process. These scripts should leverage `backend/src/interfaces/kg_interface.py` and `backend/src/interfaces/vector_db_interface.py`.

*   **`ingest_concepts.py`:**
    *   Parses various source formats (CSV, JSON, potentially XML/RDF).
    *   Maps source data fields to the KG schema (Node labels, properties).
    *   Handles data cleaning and basic normalization (e.g., consistent naming).
    *   Performs batch inserts/merges into Neo4j using `kg_interface.add_concept` or more specialized methods.
    *   Requires robust error handling and logging.
    *   Needs mechanisms to avoid duplicate entries (e.g., using MERGE on unique identifiers/names).
*   **`ingest_relationships.py`:**
    *   Parses relationship data from sources or potentially uses NLP techniques on text corpora to extract relationships (advanced).
    *   Maps relationship types to the KG schema.
    *   Looks up existing nodes in Neo4j (using `kg_interface.find_concept_by_name` or similar) to connect.
    *   Performs batch relationship creation in Neo4j.
    *   Handles ambiguity resolution (e.g., multiple thinkers with the same name).
*   **`populate_vector_db.py` (Existing, potentially enhanced):**
    *   Iterates through specified node labels (`Concept`, `PhilosophicalConcept`, `ScientificConcept`, `Synthesis`, etc.) in the KG.
    *   Retrieves relevant text for embedding (e.g., `description`, `name`, potentially text from related `Work` nodes).
    *   Generates embeddings using `vector_db_interface.get_embedding`.
    *   Batch inserts or upserts embeddings into ChromaDB, storing the ChromaDB ID back as a property (`vector_id`) on the corresponding Neo4j node for linkage.
    *   Needs configuration for embedding models and ChromaDB connection details.

## 4. Curation Process

Automated ingestion is necessary for scale but insufficient for quality. A robust curation process is crucial:

*   **Source Vetting:** Human review of potential data sources for reliability, bias, and alignment.
*   **Schema Adherence:** Ensuring ingested data correctly maps to the intended schema.
*   **Relationship Validation:** Reviewing automatically extracted or ingested relationships for accuracy and relevance. This might involve expert review for specific domains.
*   **Conflict Resolution:** Handling contradictory information from different sources.
*   **Ongoing Maintenance:** Regularly reviewing and updating concepts and relationships as knowledge evolves.

Tools or interfaces might be needed to facilitate this curation process.

## 5. Scaling Considerations

Ingesting large datasets requires attention to performance and scalability:

*   **Neo4j:**
    *   **Batching:** Use batched transactions (`UNWIND ... MERGE/CREATE`) for ingestion scripts instead of single operations.
    *   **Indexing:** Define appropriate indexes on node labels and frequently queried properties (e.g., `name`, `id`). Analyze query performance (`EXPLAIN`, `PROFILE`) to identify bottlenecks.
    *   **Memory/Hardware:** Ensure sufficient RAM and appropriate configuration for the Neo4j instance. Consider database sharding/clustering for very large graphs (complex).
*   **ChromaDB:**
    *   **Batching:** Use batch operations for adding/upserting embeddings.
    *   **Indexing:** Understand ChromaDB's indexing mechanisms (HNSW default) and potential tuning parameters.
    *   **Hardware:** Ensure sufficient resources (CPU, RAM, potentially GPU for certain index types or embedding models). Consider distributed deployment options if needed.
*   **Ingestion Pipeline:**
    *   Design scripts for parallel processing where possible.
    *   Use message queues or workflow orchestration tools (e.g., Airflow, Prefect) for complex, multi-stage ingestion tasks.
    *   Implement robust monitoring and alerting for the ingestion pipeline.

This strategy provides a roadmap for expanding the KI. Specific implementation details for each script and curation step will be developed based on the chosen data sources and evolving requirements. 