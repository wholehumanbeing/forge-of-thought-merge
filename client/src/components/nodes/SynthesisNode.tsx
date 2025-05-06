import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import useCanvasStore from '../../store/canvasStore';
import clsx from 'clsx';

// Define the expected data structure for Synthesis nodes
interface SynthesisNodeData {
  label: string;
  description?: string; // Synthesis text
  parentIds?: string[];
  // Add other relevant properties if needed
}

// Consider moving clip-path to CSS if preferred
const hexagonClipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const SynthesisNode: React.FC<NodeProps<SynthesisNodeData>> = ({ id, data, selected }) => {
  // Select state individually
  const inspectorContent = useCanvasStore((state) => state.inspectorContent);
  const inspectorType = useCanvasStore((state) => state.inspectorType);

  const isInspectorSelected = inspectorType === 'node' && inspectorContent?.id === id;
  const isHighlighted = selected || isInspectorSelected;

  const handleBaseStyle = '!w-2 !h-2 !bg-gray-500 dark:!bg-dark-text-secondary !border-none';
  const handleSideStyle = '!w-1.5 !h-1.5 !bg-gray-400 dark:!bg-gray-600 !border-none';

  // Need specific styles for the top/bottom duplicate handles if keeping them
  const handleTopSourceStyle = clsx(handleBaseStyle, '!bottom-[-4px] !top-auto');
  const handleBottomTargetStyle = clsx(handleBaseStyle, '!top-[-4px] !bottom-auto');

  return (
    <div
      className={clsx(
        'text-center shadow-md transition-all duration-200 ease-in-out',
        'flex flex-col items-center justify-center',
        'w-[150px] h-[130px] p-4 text-xs', // Keep fixed size for hexagon
        'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/60',
        {
          'border-2 border-accent dark:border-accent shadow-lg scale-105': isHighlighted,
          'border': !isHighlighted,
        }
      )}
      style={{ clipPath: hexagonClipPath }} // Apply clip-path via style prop
      title={data.description || data.label}
    >
      <div className="font-bold mb-1 overflow-hidden text-ellipsis line-clamp-2">
        {data.label}
      </div>
      {/* Optional Description Snippet */}
      {/* <div className="text-xs italic line-clamp-2">{data.description}</div> */}

      {/* Handles with Tailwind styles */}
      <Handle type="target" position={Position.Top} id="s_in_t" className={handleBaseStyle} />
      <Handle type="source" position={Position.Bottom} id="s_out_b" className={handleBaseStyle} />
      <Handle type="target" position={Position.Left} id="s_in_l" className={handleSideStyle} />
      <Handle type="source" position={Position.Right} id="s_out_r" className={handleSideStyle} />

      {/* Additional Top/Bottom Handles */}
      <Handle type="source" position={Position.Top} id="s_out_t" className={handleTopSourceStyle} />
      <Handle type="target" position={Position.Bottom} id="s_in_b" className={handleBottomTargetStyle} />
    </div>
  );
};

export default memo(SynthesisNode); 