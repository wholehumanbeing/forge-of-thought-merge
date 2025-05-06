
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Tube } from "@react-three/drei";

export type Node = {
  id: string;
  type: string;
  color: string;
  pos: [number, number, number];
};

export type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
};

interface InstancedNodesProps {
  nodes: Node[];
  edges?: Edge[];
  onCreateEdge?: (sourceId: string, targetId: string) => void;
}

const InstancedNodes: React.FC<InstancedNodesProps> = ({ 
  nodes, 
  edges = [], 
  onCreateEdge 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const { camera, raycaster, mouse, gl } = useThree();
  
  // Create a map of node positions for easier access
  const nodePositions = React.useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    nodes.forEach(node => {
      positions[node.id] = node.pos;
    });
    return positions;
  }, [nodes]);

  // Handle raycasting for interaction
  useFrame(() => {
    if (!meshRef.current || nodes.length === 0) return;
    
    // Reset scales
    nodes.forEach((node, i) => {
      const matrix = new THREE.Matrix4();
      const scale = hovered === node.id ? 1.1 : 1.0;
      
      matrix.compose(
        new THREE.Vector3(...node.pos),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale)
      );
      
      meshRef.current?.setMatrixAt(i, matrix);
    });
    
    // Update instance matrix
    if (meshRef.current.instanceMatrix) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Check for hover
    if (!dragging) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined && instanceId < nodes.length) {
          const hoveredNode = nodes[instanceId];
          setHovered(hoveredNode.id);
          gl.domElement.style.cursor = 'grab';
        } else {
          setHovered(null);
          gl.domElement.style.cursor = 'auto';
        }
      } else {
        setHovered(null);
        gl.domElement.style.cursor = 'auto';
      }
    }
  });

  // Handle mouse events
  useEffect(() => {
    const handleMouseDown = () => {
      if (hovered) {
        setDragging(hovered);
        gl.domElement.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      if (dragging && hovered && dragging !== hovered) {
        // Create edge between dragged node and hovered node
        if (onCreateEdge) {
          onCreateEdge(dragging, hovered);
        }
      }
      setDragging(null);
      gl.domElement.style.cursor = hovered ? 'grab' : 'auto';
    };

    const domElement = gl.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, hovered, dragging, onCreateEdge]);

  // Render edges
  const edgeElements = edges.map(edge => {
    const sourcePos = nodePositions[edge.sourceId];
    const targetPos = nodePositions[edge.targetId];
    
    if (!sourcePos || !targetPos) return null;
    
    // Create a curve between nodes
    const points = [
      new THREE.Vector3(...sourcePos),
      new THREE.Vector3(...targetPos)
    ];
    
    const curve = new THREE.CatmullRomCurve3(points);
    
    return (
      <Tube 
        key={edge.id}
        args={[curve, 0.06, 8, 16, false]}
      >
        <meshStandardMaterial color="#49E3F6" />
      </Tube>
    );
  });

  return (
    <>
      {/* Render edges */}
      {edgeElements}
      
      {/* Render nodes */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, nodes.length > 0 ? nodes.length : 1]}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial />
        {nodes.map((node, i) => {
          const matrix = new THREE.Matrix4();
          const scale = hovered === node.id ? 1.1 : 1.0;
          
          matrix.compose(
            new THREE.Vector3(...node.pos),
            new THREE.Quaternion(),
            new THREE.Vector3(scale, scale, scale)
          );
          
          if (meshRef.current) {
            meshRef.current.setMatrixAt(i, matrix);
            
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
    </>
  );
};

export default InstancedNodes;
