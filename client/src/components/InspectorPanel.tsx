import React from 'react';
import { useInspectorData } from '../hooks/useInspectorData';
import { Node, Edge } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeNodeData, EdgeData, NodeContextData, NodeType, LineageReport, RelevantEdgeInfo, RelatedNodeInfo } from '../types/api';
import { ALCHEMICAL_EDGES_MAP } from '../constants/semanticRelationships';

// Helper component for loading state
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
  </div>
);

// Helper component to render node context details
const NodeContextDisplay: React.FC<{ context: NodeContextData | 'loading' | 'error', kiId: string }> = ({ context, kiId }) => {
  if (context === 'loading' || context === 'error' || !context || typeof context !== 'object') {
     return <p className="text-xs text-gray-500 italic">Context not available or failed to load for {kiId}.</p>;
  }

  const hasContent = context.summary || (context.relatedNodes && context.relatedNodes.length > 0) || (context.relevantEdges && context.relevantEdges.length > 0);

  if (!hasContent) {
     return <p className="text-xs text-gray-500 italic">No detailed context found for {kiId}.</p>;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-dark-border">
      <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-dark-text flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Knowledge Context
      </h4>
      
      {/* Summary section */}
      {context.summary && (
        <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">{context.summary}</p>
        </div>
      )}
      
      {/* Related Nodes section */}
      {context.relatedNodes && context.relatedNodes.length > 0 && (
        <details className="mb-3 group" open>
          <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
            <svg className="h-3.5 w-3.5 mr-1 transform transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Related Concepts ({context.relatedNodes.length})
          </summary>
          <div className="ml-2 mt-1">
            <ul className="space-y-1">
              {context.relatedNodes.map((node: RelatedNodeInfo) => (
                <li key={node.id} className="flex items-center text-xs hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-sm">
                  <span className={`w-2 h-2 rounded-full mr-2 ${getTypeColor(node.type)}`}></span>
                  <span className="text-gray-700 dark:text-gray-300" title={`Type: ${node.type || 'unknown'}`}>
                    {node.label}
                    {node.relationship && (
                       <span className="ml-1 text-gray-400 dark:text-gray-500 text-[10px]">({node.relationship})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      
      {/* Relevant Edges section */}
      {context.relevantEdges && context.relevantEdges.length > 0 && (
        <details className="mb-3 group">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
            <svg className="h-3.5 w-3.5 mr-1 transform transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Known Relationships ({context.relevantEdges.length})
          </summary>
          <div className="ml-2 mt-1">
            <ul className="space-y-1">
              {context.relevantEdges.map((edge: RelevantEdgeInfo) => (
                <li key={edge.id} className="flex items-center text-xs hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {edge.semantic_label || edge.label || 'Related'}
                    <span className="text-gray-500 text-[10px] ml-1">
                      ({edge.source.substring(0,4)}...→{edge.target.substring(0,4)}...)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
};

// Helper component to display Lineage Report
const LineageReportDisplay: React.FC<{ lineageReport?: LineageReport }> = ({ lineageReport }) => {
  if (!lineageReport) {
    return <p className="text-xs text-gray-500 italic">No lineage report available.</p>;
  }

  const categories = Object.entries(lineageReport).filter(([, items]) => items && Array.isArray(items) && items.length > 0);

  if (categories.length === 0) {
     return <p className="text-xs text-gray-500 italic">Lineage report is empty.</p>;
  }

  return (
    <div className="space-y-2">
      {categories.map(([category, items]) => (
        <div key={category}>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">{category.replace(/_/g, ' ')}</h5>
          <ul className="list-disc list-inside ml-4 text-xs space-y-1">
            {items?.map((item: { id: string; name: string; description?: string; contribution?: string }) => (
              <li key={item.id} title={item.description || item.contribution || 'No details'}>
                {item.name}
                {item.contribution && <span className="text-gray-500 text-[10px]">: {item.contribution.substring(0, 50)}...</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// Helper function to get color based on node type
const getTypeColor = (type?: NodeType | string): string => {
  switch (type) {
    case NodeType.Thinker:
      return 'bg-purple-500';
    case NodeType.School:
      return 'bg-amber-500';
    case NodeType.Axiom:
      return 'bg-blue-500';
    case NodeType.Metaphor:
      return 'bg-green-500';
    case NodeType.Synthesis:
      return 'bg-red-500';
    case NodeType.Concept:
    default:
      return 'bg-gray-500';
  }
};

const InspectorPanel: React.FC = () => {
  const {
    isInspectorOpen,
    inspectorType,
    selectedNode,
    selectedEdge,
    nodeContextCache,
    isLoadingNodeContext,
    closeInspector,
    setEdgeSemanticType,
    fetchNodeContext,
    updateNodeData,
  } = useInspectorData();

  React.useEffect(() => {
    const kiId = selectedNode?.data?.ki_id;
    if (inspectorType === 'node' && selectedNode && kiId) {
      fetchNodeContext(kiId);
    }
  }, [inspectorType, selectedNode?.data?.ki_id, selectedNode, fetchNodeContext]);

  // Handle semantic type change for edges
  const handleSemanticTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedEdge) {
      const newType = event.target.value as keyof typeof ALCHEMICAL_EDGES_MAP;
      setEdgeSemanticType(selectedEdge.id, newType);
    }
  };

  const panelVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  };

  // Node details rendering
  const renderNodeDetails = (node: Node<KnowledgeNodeData>) => {
    const data = node.data;
    const kiId = data?.ki_id;
    const contextStatus = kiId ? nodeContextCache[kiId] : undefined;
    const isContextLoading = isLoadingNodeContext && kiId && (!contextStatus || contextStatus === 'loading');
    const isSynthesisNode = data?.type === NodeType.Synthesis;

    return (
      <>
        <p><strong>ID:</strong> <span className="font-mono text-xs break-all">{node.id}</span></p>
        {kiId && <p><strong>KI ID:</strong> <span className="font-mono text-xs break-all">{kiId}</span></p>}
        <p><strong>Type:</strong> <span className="font-mono text-xs capitalize">{data?.type || 'Unknown'}</span></p>
        {data?.label && (
          <p>
            <strong>Label:</strong>
            <input
              type="text"
              value={data.label}
              onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
              className="ml-1 p-1 border rounded bg-gray-50 dark:bg-dark-input dark:border-dark-border text-sm w-full"
            />
          </p>
        )}
        {data?.description && <p><strong>Description:</strong> <span className="text-sm">{data.description}</span></p>}
        {data?.concept_type && <p><strong>Concept Type:</strong> <span className="text-sm">{data.concept_type}</span></p>}
        {data?.concept_source && <p><strong>Source:</strong> <span className="text-sm font-mono text-xs">{data.concept_source}</span></p>}
        {data?.created_at && <p><strong>Created:</strong> <span className="text-xs">{new Date(data.created_at).toLocaleString()}</span></p>}
        {data?.updated_at && <p><strong>Updated:</strong> <span className="text-xs">{new Date(data.updated_at).toLocaleString()}</span></p>}

        {/* Synthesis Output (if applicable) */}
        {isSynthesisNode && data.synthesisOutput && (
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-dark-border">
            <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-dark-text flex items-center">Synthesis Result</h4>
            <p className="text-xs italic text-gray-600 dark:text-gray-400">{data.synthesisOutput.description || 'No description provided.'}</p>
            {data.lineageReport && (
              <details className="mt-2 group">
                <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <svg className="h-3.5 w-3.5 mr-1 transform transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  View Lineage Report
                </summary>
                <div className="ml-2 mt-1 bg-gray-50 dark:bg-dark-bg-secondary p-2 rounded border border-gray-200 dark:border-dark-border">
                  <LineageReportDisplay lineageReport={data.lineageReport} />
                </div>
              </details>
            )}
          </div>
        )}

        {/* Node Context Section */}
        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-dark-border">
          {!kiId ? (
            <p className="text-xs text-gray-500 italic">No Knowledge Index ID associated with this node.</p>
          ) : isContextLoading ? (
            <LoadingSpinner />
          ) : contextStatus === 'error' ? (
            <p className="text-xs text-red-500 italic">Could not load context from Knowledge Index.</p>
          ) : contextStatus && typeof contextStatus === 'object' ? (
            <NodeContextDisplay context={contextStatus} kiId={kiId} />
          ) : (
            <p className="text-xs text-gray-500 italic">No detailed context available.</p>
          )}
        </div>

        {/* Raw Data (Debug) */}
        <details className="mt-4 pt-4 border-t border-gray-300 dark:border-dark-border">
          <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">Show Raw Node Data</summary>
          <pre className="text-xs p-2 mt-1 rounded bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
            {JSON.stringify(node, null, 2)}
          </pre>
        </details>
      </>
    );
  };

  // Edge details rendering
  const renderEdgeDetails = (edge: Edge<EdgeData>) => {
    const data = edge.data || {};
    const currentType = data.semantic_type;

    return (
      <>
        <p><strong>ID:</strong> <span className="font-mono text-xs break-all">{edge.id}</span></p>
        <p><strong>Source:</strong> <span className="font-mono text-xs break-all">{edge.source}</span></p>
        <p><strong>Target:</strong> <span className="font-mono text-xs break-all">{edge.target}</span></p>

        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-dark-border">
          <label htmlFor="semanticTypeSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semantic Relationship:</label>
          <select 
            id="semanticTypeSelect"
            value={currentType || ''} 
            onChange={handleSemanticTypeChange}
            className="block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="" disabled>Select Type...</option>
            {Object.entries(ALCHEMICAL_EDGES_MAP).map(([typeKey, typeInfo]) => (
              <option key={typeKey} value={typeKey}>{typeInfo.label} ({typeInfo.categoryLabel})</option>
            ))}
          </select>
        </div>

        {data.label && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Current Label: {data.label}</p>}
      </>
    );
  };

  // Determine content based on selected type
  const content = inspectorType === 'node' && selectedNode 
    ? renderNodeDetails(selectedNode) 
    : inspectorType === 'edge' && selectedEdge 
    ? renderEdgeDetails(selectedEdge) 
    : <p className="text-sm text-gray-500 italic p-4">Select a node or edge to inspect.</p>;

  return (
    <AnimatePresence>
      {isInspectorOpen && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-dark-panel shadow-lg z-10 flex flex-col border-l border-gray-200 dark:border-dark-border"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text">
              {inspectorType === 'node' && selectedNode ? selectedNode.data?.label || 'Node' : 
               inspectorType === 'edge' && selectedEdge ? 'Relationship' : 'Inspector'}
            </h3>
            <button 
              onClick={closeInspector} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
              aria-label="Close Inspector"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-grow p-4 overflow-y-auto text-sm text-gray-700 dark:text-dark-text">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InspectorPanel; 