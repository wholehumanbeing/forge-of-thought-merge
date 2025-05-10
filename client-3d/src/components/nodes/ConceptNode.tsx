import React from 'react';
import { RoundedBox, Html } from '@react-three/drei';
import { Node } from '@/store/useForgeStore'; // Path to your store's Node type
import * as THREE from 'three';

interface ConceptNodeProps {
  node: Node;
  isSelected?: boolean;
  onClick?: (nodeId: string) => void;
}

const ConceptNode: React.FC<ConceptNodeProps> = ({ node, isSelected, onClick }) => {
  const { id, label, type, color, pos, scale = 1 } = node;

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  // Basic differentiation by type for now, can be expanded
  let geometryElement; // Renamed to avoid conflict with THREE.Geometry if ever used
  switch (type.toLowerCase()) {
    case 'concept':
      geometryElement = <RoundedBox args={[1.5 * scale, 1 * scale, 0.5 * scale]} radius={0.1 * scale} smoothness={4}>
                        <meshStandardMaterial color={isSelected ? '#FFD700' : color || '#ADD8E6'} />
                      </RoundedBox>;
      break;
    case 'thinker':
      geometryElement = <mesh>
                        <boxGeometry args={[1.2 * scale, 1.2 * scale, 1.2 * scale]} />
                        <meshStandardMaterial color={isSelected ? '#FFD700' : color || '#A0A0A0'} />
                      </mesh>;
      break;
    case 'work':
      geometryElement = <mesh>
                        <cylinderGeometry args={[0.8 * scale, 0.8 * scale, 0.4 * scale, 32]} />
                        <meshStandardMaterial color={isSelected ? '#FFD700' : color || '#A0A0A0'} />
                      </mesh>;
      break;
    default:
      geometryElement = <mesh>
                        <sphereGeometry args={[0.75 * scale, 32, 32]} />
                        <meshStandardMaterial color={isSelected ? '#FFD700' : color || '#A0A0A0'} />
                      </mesh>;
  }

  return (
    <group position={new THREE.Vector3(...pos)} onClick={handleClick}>
      {geometryElement}
      
      <Html
        position={[0, (scale * 0.5) + 0.3, 0]} // Position label slightly above the node center
        center
        distanceFactor={10} // Makes text scale with distance
        occlude // Hides label if occluded by another mesh (can pass array of refs too)
        style={{
          pointerEvents: 'none', // Allow clicks to pass through to the mesh
          userSelect: 'none',
        }}
      >
        <div 
          style={{
            padding: '3px 6px',
            background: 'rgba(20, 20, 20, 0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: `${Math.max(10, 14 * scale)}px`, // Basic scaling for font size
            textAlign: 'center',
            minWidth: '50px',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
};

export default ConceptNode; 