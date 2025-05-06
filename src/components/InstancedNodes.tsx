import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Tube } from "@react-three/drei";
import { Node, Edge } from "@/store/useForgeStore";

interface InstancedNodesProps {
  nodes: Node[];
  edges?: Edge[];
  onCreateEdge?: (sourceId: string, targetId: string) => void;
  onSelectNode?: (nodeId: string) => void;
  selectedNodeIds?: string[];
  synthesizing?: boolean;
}

const InstancedNodes: React.FC<InstancedNodesProps> = ({ 
  nodes, 
  edges = [], 
  onCreateEdge,
  onSelectNode,
  selectedNodeIds = [],
  synthesizing = false
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const synthesisMeshRef = useRef<THREE.InstancedMesh>(null);
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

  useFrame(() => {
    if (!meshRef.current || nodes.length === 0) return;
    
    // Reset scales and update for selection/hover states
    nodes.forEach((node, i) => {
      if (node.type === 'synthesis') return; // Skip synthesis nodes, they use a different mesh
      
      const matrix = new THREE.Matrix4();
      // Apply multiple scale factors:
      // - Base scale (default 1.0 or specified in the node)
      // - Hover scale (1.1 if hovered)
      // - Selection scale (1.15 if selected)
      // - Synthesis animation scale (if applicable)
      let baseScale = node.scale || 1.0;
      const hoverFactor = hovered === node.id ? 1.1 : 1.0;
      const selectionFactor = selectedNodeIds.includes(node.id) ? 1.15 : 1.0;
      
      const finalScale = baseScale * hoverFactor * selectionFactor;
      
      matrix.compose(
        new THREE.Vector3(...node.pos),
        new THREE.Quaternion(),
        new THREE.Vector3(finalScale, finalScale, finalScale)
      );
      
      meshRef.current?.setMatrixAt(i, matrix);
    });
    
    // Update instance matrix for regular nodes
    if (meshRef.current.instanceMatrix) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update synthesis nodes (if any)
    if (synthesisMeshRef.current) {
      const synthesisNodes = nodes.filter(node => node.type === 'synthesis');
      synthesisNodes.forEach((node, i) => {
        const matrix = new THREE.Matrix4();
        const scale = node.scale || 1.0;
        
        matrix.compose(
          new THREE.Vector3(...node.pos),
          new THREE.Quaternion(),
          new THREE.Vector3(scale, scale, scale)
        );
        
        synthesisMeshRef.current?.setMatrixAt(i, matrix);
      });
      
      if (synthesisMeshRef.current.instanceMatrix && synthesisNodes.length > 0) {
        synthesisMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // Check for hover (unless synthesizing or dragging)
    if (!synthesizing && !dragging) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined && instanceId < nodes.filter(n => n.type !== 'synthesis').length) {
          const hoveredNode = nodes.filter(n => n.type !== 'synthesis')[instanceId];
          setHovered(hoveredNode.id);
          gl.domElement.style.cursor = selectedNodeIds.includes(hoveredNode.id) ? 'grab' : 'pointer';
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

  useEffect(() => {
    const handleMouseDown = () => {
      if (hovered) {
        if (onSelectNode) {
          onSelectNode(hovered);
        }
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
      gl.domElement.style.cursor = hovered ? 'pointer' : 'auto';
    };

    const domElement = gl.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, hovered, dragging, onCreateEdge, onSelectNode]);

  const conceptNodes = nodes.filter(node => node.type !== 'synthesis');
  const synthesisNodes = nodes.filter(node => node.type === 'synthesis');

  const edgeElements = edges.map(edge => {
    // For synthesis rays
    if (edge.isRay && edge.midpoint) {
      const sourcePos = nodePositions[edge.sourceId];
      
      if (!sourcePos) return null;
      
      // Create a curve between node and midpoint
      const points = [
        new THREE.Vector3(...sourcePos),
        new THREE.Vector3(...edge.midpoint)
      ];
      
      const curve = new THREE.CatmullRomCurve3(points);
      
      return (
        <Tube 
          key={edge.id}
          args={[curve, 0.06, 8, 16, false]}
        >
          <meshStandardMaterial 
            color={edge.color} 
            emissive={edge.color} 
            emissiveIntensity={1.5}
          />
        </Tube>
      );
    }
    
    // For regular edges between nodes
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
        <meshStandardMaterial color={edge.color} />
      </Tube>
    );
  });

  return (
    <>
      {edgeElements}
      
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, Math.max(1, conceptNodes.length)]}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial />
        {conceptNodes.map((node, i) => {
          const matrix = new THREE.Matrix4();
          const baseScale = node.scale || 1.0;
          const isHovered = hovered === node.id;
          const isSelected = selectedNodeIds.includes(node.id);
          
          // Apply scaling effects
          const scaleFactor = baseScale * 
            (isHovered ? 1.1 : 1.0) * 
            (isSelected ? 1.15 : 1.0);
          
          matrix.compose(
            new THREE.Vector3(...node.pos),
            new THREE.Quaternion(),
            new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor)
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
      
      {synthesisNodes.length > 0 && (
        <instancedMesh
          ref={synthesisMeshRef}
          args={[undefined, undefined, Math.max(1, synthesisNodes.length)]}
        >
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial 
            emissive="#F3B248"
            emissiveIntensity={1.5}
          />
          {synthesisNodes.map((node, i) => {
            const matrix = new THREE.Matrix4();
            const scale = node.scale || 1.0;
            
            matrix.compose(
              new THREE.Vector3(...node.pos),
              new THREE.Quaternion(),
              new THREE.Vector3(scale, scale, scale)
            );
            
            if (synthesisMeshRef.current) {
              synthesisMeshRef.current.setMatrixAt(i, matrix);
              
              // Set color for this instance
              const color = new THREE.Color(node.color);
              synthesisMeshRef.current.setColorAt(i, color);
              if (synthesisMeshRef.current.instanceColor) {
                synthesisMeshRef.current.instanceColor.needsUpdate = true;
              }
            }
            
            return null;
          })}
        </instancedMesh>
      )}
    </>
  );
};

export default InstancedNodes;
