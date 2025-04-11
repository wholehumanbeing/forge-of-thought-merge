import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow'; // Updated import path for RF v11+
import useCanvasStore from '../../store/canvasStore'; // Import the store
import clsx from 'clsx'; // Utility for conditional classes

interface SchoolNodeData {
  name: string;
  // Add other relevant properties if needed
}

const SchoolNode: React.FC<NodeProps<SchoolNodeData>> = ({ id, data, selected }) => {
  // Get inspector state
  const { inspectorContent, inspectorType } = useCanvasStore((state) => ({
    inspectorContent: state.inspectorContent,
    inspectorType: state.inspectorType,
  }));

  // Determine if this node is selected in the inspector
  const isInspectorSelected = inspectorType === 'node' && inspectorContent?.id === id;

  // Combine internal selection and inspector selection for highlighting
  const isHighlighted = selected || isInspectorSelected;

  // Define consistent handle styles
  const handleBaseStyle = '!w-2 !h-2 !bg-gray-500 dark:!bg-dark-text-secondary !border-none';
  const handleSideStyle = '!w-1.5 !h-1.5 !bg-gray-400 dark:!bg-gray-600 !border-none';

  return (
    <div
      className={clsx(
        'rounded text-center shadow-md transition-all duration-200 ease-in-out',
        'min-w-[80px] px-4 py-2.5 text-sm', // Adjusted padding and text size slightly
        'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200', // Adjusted colors
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border border-blue-200 dark:border-blue-800/50': !isHighlighted, // Adjusted border colors
        }
      )}
    >
      {/* Minimal display: Just the name */}
      <div className="font-medium">{data.name}</div>

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

export default memo(SchoolNode); 