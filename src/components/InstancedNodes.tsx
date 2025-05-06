
import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export type Node = {
  id: string;
  type: string;
  color: string;
  pos: [number, number, number];
};

interface InstancedNodesProps {
  nodes: Node[];
}

const InstancedNodes: React.FC<InstancedNodesProps> = ({ nodes }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // You can add animations or updates here if needed
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, nodes.length > 0 ? nodes.length : 1]}
    >
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial />
      {nodes.map((node, i) => {
        const matrix = new THREE.Matrix4();
        matrix.setPosition(new THREE.Vector3(...node.pos));
        
        if (meshRef.current) {
          meshRef.current.setMatrixAt(i, matrix);
          meshRef.current.instanceMatrix.needsUpdate = true;
          
          // Set color for this instance
          const color = new THREE.Color(node.color);
          meshRef.current.setColorAt(i, color);
          if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
          }
        }
        
        return null;
      })}
    </instancedMesh>
  );
};

export default InstancedNodes;
