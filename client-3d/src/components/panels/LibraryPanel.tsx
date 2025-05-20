import React, { useState, useEffect, useCallback } from 'react';
import { Node } from '@/types/graph';
import { searchConcepts } from '@/services/api';

interface LibraryPanelProps {
  onNodeSelect: (node: Node) => void; // Callback when a node is selected to be placed
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ onNodeSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const MAX_DISPLAYED_RESULTS = 5;

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
      
      // Extract unique domains
      const domains = Array.from(new Set(
        results
          .filter(node => node.data?.domain)
          .map(node => node.data.domain as string)
      ));
      setAvailableDomains(domains);
      
      // Filter results by domain if a filter is set
      const filteredResults = domainFilter 
        ? results.filter(node => node.data?.domain === domainFilter)
        : results;
        
      setSearchResults(filteredResults);
      console.log('[LibraryPanel] searchResults state updated.'); // LOG D
    } catch (err) {
      console.error('[LibraryPanel] Error in performSearch:', err); // LOG E
      setError(err instanceof Error ? err.message : 'Failed to fetch concepts');
      setSearchResults([]);
    }
    setIsLoading(false);
  }, [domainFilter]);

  // Initial search when component mounts
  useEffect(() => {
    console.log('[LibraryPanel] Initial useEffect triggered for performSearch("*").'); // LOG F
    performSearch('*');
  }, [performSearch]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    // Search on every change
    performSearch(newSearchTerm);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performSearch(searchTerm);
  };
  
  const handleNodeSelect = (node: Node) => {
    console.log('[LibraryPanel] Node selected from library:', node); // LOG G
    onNodeSelect(node); // This will call the function passed from the parent to handle placement
  };

  const handleDomainFilterChange = (domain: string | null) => {
    setDomainFilter(domain === domainFilter ? null : domain);
  };
  
  // Styles will be basic, assuming Tailwind or global CSS might be applied later
  // For now, using inline styles or simple class names for structure.
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    width: '350px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'rgba(25, 25, 40, 0.95)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    zIndex: 9999, // Significantly higher to ensure it's above everything
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(65, 85, 125, 0.5)',
  };

  const listStyle: React.CSSProperties = {
    listStyleType: 'none',
    padding: 0,
    margin: '10px 0 0 0',
    overflowY: 'auto',
    flexGrow: 1,
    maxHeight: '300px',
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
    marginBottom: '10px',
  };

  const filterContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '10px',
    marginBottom: '10px',
  };

  const filterButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    fontSize: '0.75em',
    background: active ? 'rgba(70, 130, 180, 0.8)' : 'rgba(40, 40, 60, 0.7)',
    color: 'white',
    border: '1px solid rgba(80, 100, 140, 0.5)',
    borderRadius: '12px',
    cursor: 'pointer',
  });

  // Get the displayed results (limited to max number)
  const displayedResults = searchResults.slice(0, MAX_DISPLAYED_RESULTS);

  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.2em', borderBottom: '1px solid rgba(80, 100, 140, 0.5)', paddingBottom: '8px' }}>
        Thought Fragments
      </h3>
      <form onSubmit={handleSearchSubmit}>
        <input 
          type="text"
          placeholder="Search thought fragments..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={inputStyle}
        />
      </form>
      
      {availableDomains.length > 0 && (
        <div style={filterContainerStyle}>
          <span style={{ fontSize: '0.8em', opacity: 0.7, marginRight: '5px', alignSelf: 'center' }}>Filter:</span>
          {availableDomains.map(domain => (
            <button 
              key={domain}
              onClick={() => handleDomainFilterChange(domain)}
              style={filterButtonStyle(domain === domainFilter)}
            >
              {domain}
            </button>
          ))}
          {domainFilter && (
            <button 
              onClick={() => setDomainFilter(null)}
              style={{ ...filterButtonStyle(false), background: 'rgba(180, 70, 70, 0.6)' }}
            >
              Clear
            </button>
          )}
        </div>
      )}
      
      {isLoading && <p style={{ textAlign: 'center', margin: '10px 0' }}>Loading...</p>}
      {error && <p style={{ color: '#ff8a8a', margin: '10px 0' }}>Error: {error}</p>}
      {!isLoading && !error && searchResults.length === 0 && searchTerm.trim() !== '' && (
        <p style={{ textAlign: 'center', margin: '10px 0' }}>No results found.</p>
      )}
      {!isLoading && !error && searchResults.length === 0 && searchTerm.trim() === '' && (
        <p style={{ textAlign: 'center', margin: '10px 0' }}>Search to discover concepts.</p>
      )}
      
      {searchResults.length > MAX_DISPLAYED_RESULTS && (
        <p style={{ textAlign: 'center', margin: '5px 0', fontSize: '0.8em', color: '#aaa' }}>
          Showing top {MAX_DISPLAYED_RESULTS} of {searchResults.length} results
        </p>
      )}
      
      <ul style={listStyle}>
        {displayedResults.map((node) => (
          <li 
            key={node.id} 
            onClick={() => handleNodeSelect(node)}
            style={{
              ...listItemStyle,
              borderLeft: `4px solid ${node.color || '#ffffff'}`,
              paddingLeft: '12px'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a4a4a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {node.label} <span style={{ opacity: 0.7, fontSize: '0.85em' }}>({node.type})</span>
            {node.data?.domain && (
              <div style={{ fontSize: '0.75em', opacity: 0.6, marginTop: '3px' }}>
                Domain: {node.data.domain}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LibraryPanel; 