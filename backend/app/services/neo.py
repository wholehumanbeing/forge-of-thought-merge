class Neo4j:
    # ... existing code ...

    async def fetch_seed_nodes(self, archetype: str) -> list[dict]:
        q = """
        MATCH (a:Archetype {name: $name})-[:HAS_SEED]->(c:Concept)
        RETURN c
        """
        return [rec["c"] for rec in await self._run(q, {"name": archetype})]

    async def fetch_default_seed_nodes(self, count: int = 3) -> list[dict]:
        q = """
        MATCH (c:Concept) RETURN c LIMIT $cnt
        """
        return [rec["c"] for rec in await self._run(q, {"cnt": count})]

    # ... existing code ... 