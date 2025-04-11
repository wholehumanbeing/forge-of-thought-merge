import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import useCanvasStore from '../../store/canvasStore'; // Import the store
import clsx from 'clsx';

interface MetaphorNodeData {
  name: string;
  description?: string;
}

const MetaphorNode: React.FC<NodeProps<MetaphorNodeData>> = ({ id, data, selected }) => {
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
        'rounded-full text-center shadow-md transition-all duration-200 ease-in-out', // Use rounded-full for pill shape
        'min-w-[60px] px-3 py-1.5 text-xs', // Adjusted padding/size
        'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-200 border-green-200 dark:border-green-800/50',
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border': !isHighlighted,
        }
      )}
    >
      {/* Display name, potentially add icon later */}
      <div className="italic">{data.name}</div>

      {/* Handles with Tailwind styles */}
      <Handle
        type="target"
        position={Position.Top}
        id="m_in"
        className={handleBaseStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="m_out"
        className={handleBaseStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="m_in_l"
        className={handleSideStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="m_out_r"
        className={handleSideStyle}
      />
    </div>
  );
};

export default memo(MetaphorNode); 