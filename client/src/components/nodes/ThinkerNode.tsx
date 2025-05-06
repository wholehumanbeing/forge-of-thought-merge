import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow'; // Updated import path for RF v11+
import useCanvasStore from '../../store/canvasStore'; // Import the store
import clsx from 'clsx'; // Utility for conditional classes

interface ThinkerNodeData {
  name: string;
  // Add other relevant properties if needed
}

const ThinkerNode: React.FC<NodeProps<ThinkerNodeData>> = ({ id, data, selected }) => {
  // Get inspector state
  const { inspectorContent, inspectorType } = useCanvasStore((state) => ({
    inspectorContent: state.inspectorContent,
    inspectorType: state.inspectorType,
  }));

  // Determine if this node is selected in the inspector
  const isInspectorSelected = inspectorType === 'node' && inspectorContent?.id === id;

  // Combine internal selection and inspector selection for highlighting
  const isHighlighted = selected || isInspectorSelected;

  const handleBaseStyle = '!w-2 !h-2 !bg-gray-500 dark:!bg-dark-text-secondary !border-none';
  const handleSideStyle = '!w-1.5 !h-1.5 !bg-gray-400 dark:!bg-gray-600 !border-none';

  return (
    <div
      className={clsx(
        'rounded-full text-center shadow-md transition-all duration-200 ease-in-out',
        'flex items-center justify-center',
        'min-w-[50px] min-h-[50px] p-2 text-xs',
        'bg-gray-100 dark:bg-dark-surface text-gray-800 dark:text-dark-text',
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border border-gray-300 dark:border-dark-border': !isHighlighted,
        }
      )}
    >
      {/* Minimal display: Just the name */}
      <div className="font-medium">{data.name}</div>

      {/* Handles with Tailwind styles */}
      <Handle
        type="target"
        position={Position.Top}
        id="t_in"
        className={handleBaseStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="t_out"
        className={handleBaseStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t_in_l"
        className={handleSideStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="t_out_r"
        className={handleSideStyle}
      />

      {/* Optional: Node Resizer if you want them resizable */}
      {/* <NodeResizer minWidth={50} minHeight={50} isVisible={selected} /> */}

      {/* Optional: Toolbar for actions */}
      {/* <NodeToolbar isVisible={selected} position={Position.Top}>
        <button>Info</button>
      </NodeToolbar> */}
    </div>
  );
};

export default memo(ThinkerNode); 