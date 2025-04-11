import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import useCanvasStore from '../../store/canvasStore';
import { CanvasState } from '../../store/canvasStore';
import { KnowledgeNodeData } from '../../types/api';
import clsx from 'clsx';

// Selector function for Zustand store to prevent unnecessary re-renders
const selectInspectorState = (state: CanvasState) => ({
  inspectorContent: state.inspectorContent,
  inspectorType: state.inspectorType,
});

const SourceNode: React.FC<NodeProps<KnowledgeNodeData>> = ({ id, data, selected }) => {
  // Use the selector function to only get what we need from the store
  const { inspectorContent, inspectorType } = useCanvasStore(selectInspectorState);

  // Determine if this node is selected in the inspector - memoize this computation
  const isInspectorSelected = useMemo(() => {
    return inspectorType === 'node' && inspectorContent?.id === id;
  }, [inspectorType, inspectorContent?.id, id]);

  // Combine internal selection and inspector selection for highlighting
  const isHighlighted = selected || isInspectorSelected;

  const nodeStyle = 'bg-slate-50 dark:bg-slate-900/30 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-800/50';
  const handleBaseStyle = '!w-2 !h-2 !bg-gray-500 dark:!bg-dark-text-secondary !border-none';
  const handleSideStyle = '!w-1.5 !h-1.5 !bg-gray-400 dark:!bg-gray-600 !border-none';

  return (
    <div
      className={clsx(
        'rounded-md text-center shadow-md transition-all duration-200 ease-in-out',
        'flex items-center justify-center',
        'min-w-[60px] min-h-[60px] p-2 text-xs',
        nodeStyle,
        'border-dashed',
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border': !isHighlighted,
        }
      )}
    >
      <div>
        <div className="font-bold">{data.name || data.label || 'Untitled'}</div>
        {data.description && data.description.length > 0 && (
          <div className="text-xs mt-1 opacity-80 line-clamp-2">{data.description}</div>
        )}
      </div>

      {/* Handles with Tailwind styles */}
      <Handle
        type="target"
        position={Position.Top}
        id="s_in"
        className={handleBaseStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s_out"
        className={handleBaseStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="s_in_l"
        className={handleSideStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s_out_r"
        className={handleSideStyle}
      />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(SourceNode); 