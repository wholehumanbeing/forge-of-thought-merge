import React, { useState, useEffect, useCallback } from 'react';
import { Node } from '@/store/useForgeStore'; // Assuming correct path to store
import { searchConcepts } from '@/services/api'; // Assuming correct path to api service
import useForgeStore from '@/store/useForgeStore'; // Corrected: default import

interface LibraryPanelProps {
  onNodeSelect: (node: Node) => void; // Callback when a node is selected to be placed
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ onNodeSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to add a node to the main scene (will be used later for placement)
  // const addNodeToScene = useForgeStore((state) => state.addNode);

  const performSearch = useCallback(async (query: string) => {
    console.log('[LibraryPanel] performSearch called with query:', query); // LOG A
    if (!query.trim() && query !== '') { // Allow empty query for initial load
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const effectiveQuery = query.trim() === '' ? '*' : query;
      console.log('[LibraryPanel] Effective query for API:', effectiveQuery); // LOG B
      const results = await searchConcepts(effectiveQuery, 20); // Assuming searchConcepts takes limit
      console.log('[LibraryPanel] Results received from searchConcepts:', results); // LOG C
      setSearchResults(results);
      console.log('[LibraryPanel] searchResults state updated.'); // LOG D
    } catch (err) {
      console.error('[LibraryPanel] Error in performSearch:', err); // LOG E
      setError(err instanceof Error ? err.message : 'Failed to fetch concepts');
      setSearchResults([]);
    }
    setIsLoading(false);
  }, []);

  // Initial search when component mounts
  useEffect(() => {
    console.log('[LibraryPanel] Initial useEffect triggered for performSearch("*").'); // LOG F
    performSearch('*');
  }, [performSearch]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Optional: debounce search
    // For now, search on every change or on submit
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performSearch(searchTerm);
  };
  
  const handleNodeSelect = (node: Node) => {
    console.log('[LibraryPanel] Node selected from library:', node); // LOG G
    onNodeSelect(node); // This will call the function passed from the parent to handle placement
  };
  
  // Styles will be basic, assuming Tailwind or global CSS might be applied later
  // For now, using inline styles or simple class names for structure.
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    width: '300px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    zIndex: 1000, // Ensure it's above the canvas
    display: 'flex',
    flexDirection: 'column',
  };

  const listStyle: React.CSSProperties = {
    listStyleType: 'none',
    padding: 0,
    margin: '10px 0 0 0',
    overflowY: 'auto',
    flexGrow: 1,
  };

  const listItemStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid #444',
    cursor: 'pointer',
    fontSize: '0.9em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: 'white',
    boxSizing: 'border-box', // So padding doesn't increase width
  };

  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.2em' }}>Concept Library</h3>
      <form onSubmit={handleSearchSubmit}>
        <input 
          type="text"
          placeholder="Search concepts..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={inputStyle}
        />
        {/* <button type="submit" style={{ marginTop: '5px'}}>Search</button> */}
      </form>
      {isLoading && <p style={{ textAlign: 'center', margin: '10px 0' }}>Loading...</p>}
      {error && <p style={{ color: '#ff8a8a', margin: '10px 0' }}>Error: {error}</p>}
      {!isLoading && !error && searchResults.length === 0 && searchTerm.trim() !== '' && (
        <p style={{ textAlign: 'center', margin: '10px 0' }}>No results found.</p>
      )}
      {!isLoading && !error && searchResults.length === 0 && searchTerm.trim() === '' && (
        <p style={{ textAlign: 'center', margin: '10px 0' }}>Search to discover concepts.</p>
      )}
      <ul style={listStyle}>
        {searchResults.map((node) => (
          <li 
            key={node.id} 
            onClick={() => handleNodeSelect(node)}
            style={listItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a4a4a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {node.label} ({node.type})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LibraryPanel; 