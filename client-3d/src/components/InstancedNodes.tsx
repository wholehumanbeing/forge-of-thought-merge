import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Tube } from "@react-three/drei";
import { Node, Edge } from "@/types/graph";

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
      positions[node.id] = node.position ?? [0, 0, 0];
    });
    return positions;
  }, [nodes]);

  useFrame(() => {
    if (!meshRef.current || nodes.length === 0) return;
    
    // Reset scales and update for selection/hover states
    const conceptNodes = nodes.filter(node => node.type !== 'synthesis');
    conceptNodes.forEach((node, i) => {
      if (i >= conceptNodes.length || !meshRef.current) return;
      
      const matrix = new THREE.Matrix4();
      // Apply multiple scale factors:
      // - Base scale (default 1.0 or specified in the node)
      // - Hover scale (1.1 if hovered)
      // - Selection scale (1.15 if selected)
      const baseScale = node.scale || 1.0;
      const hoverFactor = hovered === node.id ? 1.1 : 1.0;
      const selectionFactor = selectedNodeIds.includes(node.id) ? 1.15 : 1.0;
      
      const finalScale = baseScale * hoverFactor * selectionFactor;
      
      matrix.compose(
        new THREE.Vector3(...(node.position ?? [0, 0, 0])),
        new THREE.Quaternion(),
        new THREE.Vector3(finalScale, finalScale, finalScale)
      );
      
      meshRef.current.setMatrixAt(i, matrix);
      
      // Set color for this instance
      const color = new THREE.Color(node.color);
      meshRef.current.setColorAt(i, color);
    });
    
    // Update instance matrix for regular nodes
    if (meshRef.current.instanceMatrix) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    // Update synthesis nodes (if any)
    const synthesisNodes = nodes.filter(node => node.type === 'synthesis');
    if (synthesisMeshRef.current && synthesisNodes.length > 0) {
      synthesisNodes.forEach((node, i) => {
        if (i >= synthesisNodes.length || !synthesisMeshRef.current) return;
        
        const matrix = new THREE.Matrix4();
        const scale = node.scale || 1.0;
        
        matrix.compose(
          new THREE.Vector3(...(node.position ?? [0, 0, 0])),
          new THREE.Quaternion(),
          new THREE.Vector3(scale, scale, scale)
        );
        
        synthesisMeshRef.current.setMatrixAt(i, matrix);
        
        // Set color for this instance
        const color = new THREE.Color(node.color);
        synthesisMeshRef.current.setColorAt(i, color);
      });
      
      if (synthesisMeshRef.current.instanceMatrix) {
        synthesisMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (synthesisMeshRef.current.instanceColor) {
        synthesisMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Check for hover (unless synthesizing or dragging)
    if (!synthesizing && !dragging) {
      raycaster.setFromCamera(mouse, camera);
      const conceptNodes = nodes.filter(n => n.type !== 'synthesis');
      if (meshRef.current && conceptNodes.length > 0) {
        const intersects = raycaster.intersectObject(meshRef.current);
        
        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && instanceId < conceptNodes.length) {
            const hoveredNode = conceptNodes[instanceId];
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
    }
  });

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      // Require Shift key to start edge-drag mode
      if (!event.shiftKey) return;
      if (hovered) {
        // Only begin drag if a node is currently hovered
        setDragging(hovered);
        gl.domElement.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      // Only process edge creation if we had an active drag that began with Shift
      if (dragging && hovered && dragging !== hovered) {
        if (onCreateEdge) {
          onCreateEdge(dragging, hovered);
        }
      }
      setDragging(null);
      // Restore cursor depending on current hover state
      gl.domElement.style.cursor = hovered ? 'pointer' : 'auto';
    };

    const domElement = gl.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, hovered, dragging, onCreateEdge]);

  // Filter nodes by type
  const conceptNodes = nodes.filter(node => node.type !== 'synthesis');
  const synthesisNodes = nodes.filter(node => node.type === 'synthesis');

  // Prepare edges to render
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

  // Render null for empty edges (to avoid issues with React's array rendering)
  const filteredEdgeElements = edgeElements.filter(edge => edge !== null);

  return (
    <>
      {filteredEdgeElements}
      
      {conceptNodes.length > 0 && (
        <instancedMesh 
          ref={meshRef} 
          args={[undefined, undefined, conceptNodes.length]}
        >
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial />
          {/* Matrix updates are handled in useFrame */}
        </instancedMesh>
      )}
      
      {synthesisNodes.length > 0 && (
        <instancedMesh
          ref={synthesisMeshRef}
          args={[undefined, undefined, synthesisNodes.length]}
        >
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial 
            emissive="#F3B248"
            emissiveIntensity={1.5}
          />
          {/* Matrix updates are handled in useFrame */}
        </instancedMesh>
      )}
    </>
  );
};

export default InstancedNodes;
