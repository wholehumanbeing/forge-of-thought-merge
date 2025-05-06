import React, { memo, useMemo, useState, MouseEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { KnowledgeNodeData as BaseKnowledgeNodeData, NodeType } from '../../types/api';
import clsx from 'clsx';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, IconButton, Tooltip } from '@mui/material';
import { useReactFlowViewport } from '../../hooks/useReactFlowViewport';

interface KnowledgeNodeData extends BaseKnowledgeNodeData {
  isInspectorSelected?: boolean;
}

// Helper function to normalize node types for comparison
const normalizeNodeType = (type: string | NodeType | undefined): NodeType => {
  // Default to Concept if no type is provided
  if (!type) return NodeType.Concept;
  
  // If it's already a NodeType enum value, return it
  if (Object.values(NodeType).includes(type as NodeType)) {
    return type as NodeType;
  }
  
  // Try to match by comparing uppercase strings
  const upperType = type.toString().toUpperCase();
  for (const enumValue of Object.values(NodeType)) {
    if (enumValue.toString().toUpperCase() === upperType) {
      return enumValue as NodeType;
    }
  }
  
  // Fallback to Concept for unrecognized types
  return NodeType.Concept;
};

const KnowledgeNode: React.FC<NodeProps<KnowledgeNodeData>> = ({ data, selected }) => {
  const isInspectorSelected = data.isInspectorSelected ?? false;
  const depth = data.depth ?? 1;
  const { getZAdjustedDepth } = useReactFlowViewport();

  const isHighlighted = selected || isInspectorSelected;

  const nodeType = normalizeNodeType(data.type);

  const getNodeStyle = useMemo(() => {
    switch(nodeType) {
      case NodeType.Concept:
      case NodeType.Axiom:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800/50';
      case NodeType.School:
        return 'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-200 border-green-200 dark:border-green-800/50';
      case NodeType.Metaphor:
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/50';
      case NodeType.Source:
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/50';
      case NodeType.Thinker:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800/50';
      case NodeType.Synthesis:
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/50';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800/50';
    }
  }, [nodeType]);

  // Determine the depth class based on the depth value
  const getDepthClass = useMemo(() => {
    if (depth <= 1) return 'depth-low';
    if (depth <= 3) return 'depth-medium';
    return 'depth-high';
  }, [depth]);

  const nodeClassName = useMemo(() => clsx(
    'knowledge-node',
    'relative',
    'rounded-lg',
    'shadow-md',
    'transition-all duration-150 ease-in-out',
    'p-4',
    'min-w-[150px] max-w-[250px]',
    getNodeStyle,
    getDepthClass,
    {
      'border-2 border-accent dark:border-accent shadow-lg scale-105 transform ring-2 ring-offset-2 ring-accent dark:ring-offset-gray-800': isHighlighted,
      'border dark:border-gray-700': !isHighlighted,
    },
    'group'
  ), [getNodeStyle, getDepthClass, isHighlighted]);

  /* ---------------- local state ---------------- */
  const [openInfo, setOpenInfo] = useState(false);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setOpenInfo(true);
  };

  const closeInfo = () => setOpenInfo(false);

  // Calculate the adjusted z-translation based on depth and current zoom level
  const zTranslate = getZAdjustedDepth(depth);

  const inlineStyle = {
    '--depth': depth.toString(),
    transform: `translateZ(${zTranslate}px)`,
  } as React.CSSProperties;

  // Determine box shadow intensity based on depth
  const getShadowStyle = useMemo(() => {
    const shadowOpacity = Math.min(0.5, 0.1 + (depth * 0.05));
    return {
      boxShadow: `0 ${depth * 2}px ${depth * 4}px rgba(0, 0, 0, ${shadowOpacity})`,
    };
  }, [depth]);

  // Combine all styles
  const combinedStyle = {
    ...inlineStyle,
    ...getShadowStyle,
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        className="!bg-gray-400 dark:!bg-gray-600 w-2 h-2 !border-2 !border-gray-200 dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        isConnectable={true}
      />
      <Tooltip title={`Depth: ${depth}`} arrow placement="top">
        <div
          className={nodeClassName}
          onContextMenu={handleContextMenu}
          title="Right-click for info (ℹ️)"
          style={combinedStyle}
        >
          <div className="font-semibold truncate text-sm">
            {data.label || data.name || 'Untitled Node'}
          </div>
        </div>
      </Tooltip>
      <Handle
        type="source"
        position={Position.Right}
        id="b"
        className="!bg-gray-400 dark:!bg-gray-600 w-2 h-2 !border-2 !border-gray-200 dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        isConnectable={true}
      />

      {/* --- Info Modal (description + stub lineage) --- */}
      <Dialog open={openInfo} onClose={closeInfo} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>ℹ️ Node Info</span>
          <IconButton size="small" onClick={closeInfo}>
            <span className="text-lg">×</span>
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Description section */}
          {data.description ? (
            <p className="text-sm mb-4 whitespace-pre-wrap break-words dark:text-gray-200">
              {data.description}
            </p>
          ) : (
            <p className="text-sm mb-4 italic text-gray-500">No description available.</p>
          )}

          {/* Depth information */}
          <p className="text-xs mb-2 text-gray-600 dark:text-gray-400">
            Depth level: {depth} ({getDepthClass.replace('depth-', '')})
          </p>

          {/* Stub lineage lists */}
          <List dense>
            <ListItem>
              <ListItemText
                primary="In this canvas you've linked to…"
                secondary="(stubbed list – coming soon)"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="In other canvases you've linked to…"
                secondary="(stubbed list – coming soon)"
              />
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default memo(KnowledgeNode); 