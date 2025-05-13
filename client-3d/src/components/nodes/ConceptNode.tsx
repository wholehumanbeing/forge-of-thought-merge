import React from 'react';
import { RoundedBox, Html, Torus, Cone, Dodecahedron, Octahedron, Sphere, TorusKnot, Box } from '@react-three/drei';
import { Node } from '@/types/graph';
import * as THREE from 'three';

interface ConceptNodeProps {
  node: Node;
  isSelected?: boolean;
  onClick?: (nodeId: string) => void;
}

const ConceptNode: React.FC<ConceptNodeProps> = ({ node, isSelected, onClick }) => {
  const { id, label, type = 'concept', color, position = [0, 0, 0], scale = 1 } = node;

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  let geometryElement;
  const nodeTypeLower = type.toLowerCase();
  const nodeColor = isSelected ? '#FFD700' : color || '#ADD8E6';

  switch (nodeTypeLower) {
    case 'concept':
      geometryElement = <Sphere args={[0.6 * scale, 32, 32]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.5}
                          metalness={0.2}
                          roughness={0.3}
                        />
                      </Sphere>;
      break;
    case 'thinker':
      geometryElement = <Cone args={[0.5 * scale, 1 * scale, 3]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.4}
                          metalness={0.3}
                          roughness={0.4}
                        />
                      </Cone>;
      break;
    case 'symbol':
      geometryElement = <TorusKnot args={[0.4 * scale, 0.1 * scale, 100, 16]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.7}
                          metalness={0.5}
                          roughness={0.2}
                        />
                      </TorusKnot>;
      break;
    case 'work':
      geometryElement = <mesh>
                        <cylinderGeometry args={[0.8 * scale, 0.8 * scale, 0.4 * scale, 32]} />
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.4}
                          metalness={0.1}
                          roughness={0.5}
                        />
                      </mesh>;
      break;
    case 'school':
      geometryElement = <Torus args={[0.6 * scale, 0.15 * scale, 16, 100]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.5}
                          metalness={0.3}
                          roughness={0.4}
                        />
                      </Torus>;
      break;
    case 'idea':
      geometryElement = <Cone args={[0.6 * scale, 1 * scale, 32]}>
                        <meshStandardMaterial 
                          color={nodeColor}
                          emissive={nodeColor}
                          emissiveIntensity={0.6}
                          metalness={0.4}
                          roughness={0.3}
                        />
                      </Cone>;
      break;
    case 'field_of_study':
      geometryElement = <Dodecahedron args={[0.7 * scale]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.5}
                          metalness={0.3}
                          roughness={0.4}
                        />
                      </Dodecahedron>;
      break;
    case 'theory':
      geometryElement = <Octahedron args={[0.7 * scale]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.5}
                          metalness={0.4}
                          roughness={0.3}
                        />
                      </Octahedron>;
      break;
    default:
      geometryElement = <Sphere args={[0.75 * scale, 32, 32]}>
                        <meshStandardMaterial 
                          color={nodeColor} 
                          emissive={nodeColor}
                          emissiveIntensity={0.4}
                          metalness={0.2} 
                          roughness={0.5}
                        />
                      </Sphere>;
  }

  return (
    <group position={new THREE.Vector3(...position)} onClick={handleClick}>
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