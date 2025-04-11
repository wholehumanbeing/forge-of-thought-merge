import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import useCanvasStore from '../../store/canvasStore'; // Import the store
import { CanvasState } from '../../store/canvasStore'; // Import store state type
import clsx from 'clsx';

interface AxiomNodeData {
  name?: string;
  label?: string;
  description?: string;
}

// Selector function for Zustand store to prevent unnecessary re-renders
const selectInspectorState = (state: CanvasState) => ({
  inspectorContent: state.inspectorContent,
  inspectorType: state.inspectorType,
});

const AxiomNode: React.FC<NodeProps<AxiomNodeData>> = ({ id, data, selected }) => {
  // Use the selector function to only get what we need from the store
  const { inspectorContent, inspectorType } = useCanvasStore(selectInspectorState);

  // Determine if this node is selected in the inspector - memoize this computation
  const isInspectorSelected = useMemo(() => {
    return inspectorType === 'node' && inspectorContent?.id === id;
  }, [inspectorType, inspectorContent?.id, id]);

  // Combine internal selection and inspector selection for highlighting
  const isHighlighted = selected || isInspectorSelected;

  const handleBaseStyle = '!w-2 !h-2 !bg-gray-500 dark:!bg-dark-text-secondary !border-none';
  const handleSideStyle = '!w-1.5 !h-1.5 !bg-gray-400 dark:!bg-gray-600 !border-none';

  return (
    <div
      className={clsx(
        'rounded-md text-center shadow-md transition-all duration-200 ease-in-out',
        'flex items-center justify-center',
        'min-w-[60px] min-h-[60px] p-2 text-xs',
        'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50',
        'border-dashed', // Retain dashed border style
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border': !isHighlighted, // Apply base border width when not highlighted
        }
      )}
    >
       {/* Content container to counter-rotate if needed */}
       {/* <div style={{ transform: 'rotate(-45deg)' }}> */}
      <div>
          <div className="font-bold">{data.name || data.label || 'Untitled'}</div>
          {/* <div style={{ fontSize: '9px', marginTop: '2px' }}>Axiom</div> */}
      </div>
      {/* </div> */}

      {/* Handles with Tailwind styles */}
      <Handle
        type="target"
        position={Position.Top}
        id="a_in"
        className={handleBaseStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="a_out"
        className={handleBaseStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="a_in_l"
        className={handleSideStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="a_out_r"
        className={handleSideStyle}
      />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(AxiomNode); 