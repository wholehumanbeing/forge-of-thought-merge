import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { KnowledgeNodeData as BaseKnowledgeNodeData, NodeType } from '../../types/api';
import clsx from 'clsx';

interface KnowledgeNodeData extends BaseKnowledgeNodeData {
  isInspectorSelected?: boolean;
}

const KnowledgeNode: React.FC<NodeProps<KnowledgeNodeData>> = ({ data, selected }) => {
  const isInspectorSelected = data.isInspectorSelected ?? false;
  const isHighlighted = selected || isInspectorSelected;

  const getNodeStyle = useMemo(() => {
    const nodeType = data.type || NodeType.Concept;
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
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800/50';
    }
  }, [data.type]);

  const nodeClassName = useMemo(() => clsx(
    'knowledge-node',
    'relative',
    'rounded-lg',
    'shadow-md',
    'transition-all duration-150 ease-in-out',
    'p-4',
    'min-w-[150px] max-w-[250px]',
    getNodeStyle,
    {
      'border-2 border-accent dark:border-accent shadow-lg scale-105 transform ring-2 ring-offset-2 ring-accent dark:ring-offset-gray-800': isHighlighted,
      'border dark:border-gray-700': !isHighlighted,
    },
    'group'
  ), [getNodeStyle, isHighlighted]);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        className="!bg-gray-400 dark:!bg-gray-600 w-2 h-2 !border-2 !border-gray-200 dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        isConnectable={true}
      />
      <div className={nodeClassName}>
        <div className="font-semibold truncate text-sm mb-1">
          {data.label || data.name || 'Untitled Node'}
        </div>
        {data.description && (
          <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-normal break-words">
            {data.description}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="b"
        className="!bg-gray-400 dark:!bg-gray-600 w-2 h-2 !border-2 !border-gray-200 dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        isConnectable={true}
      />
    </>
  );
};

export default memo(KnowledgeNode); 