import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

// Define the shape of the data our node holds
export interface EditableNodeData {
  label: string;
  // Add other custom data properties here later if needed
}

// Define the props specifically for our custom node
// Merging NodeProps with our data type
type EditableTextNodeProps = NodeProps<EditableNodeData>;

const EditableTextNode: React.FC<EditableTextNodeProps> = ({ id, data }) => {
  const { setNodes } = useReactFlow(); // Hook to get access to React Flow instance methods
  const [currentLabel, setCurrentLabel] = useState(data.label || '');

  // Callback to update the node's data in the global state when input changes
  const onLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = evt.target.value;
    setCurrentLabel(newLabel); // Update local state for immediate input feedback

    // Update the global nodes state
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Create a new object to ensure React Flow detects the change
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]); // Include setNodes in dependencies

  // Basic styling for the node
  const nodeStyle: React.CSSProperties = {
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    background: 'white',
    fontSize: '12px',
    minWidth: '150px', // Ensure minimum width
  };

  return (
    <div style={nodeStyle}>
      {/* Input Handle (Top) */}
      <Handle type="target" position={Position.Top} id="top" />

      {/* Node Content */}
      <input
        type="text"
        value={currentLabel}
        onChange={onLabelChange}
        className="nodrag" // Prevent node dragging when interacting with the input
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
      />

      {/* Output Handles (Optional - add if needed) */}
      <Handle type="source" position={Position.Bottom} id="bottom" />
      {/* <Handle type="source" position={Position.Right} id="right" /> */}
    </div>
  );
};

export default EditableTextNode; 