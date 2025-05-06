
import { Canvas, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from 'three';
import { useRef } from "react";
import InstancedNodes from "./InstancedNodes";
import { Node, Edge } from "./InstancedNodes";

console.log('THREE revision', THREE.REVISION); // Debug to check Three.js version

const CatwalkFloor = () => {
  // Create refs for the five floor planes
  const floorRefs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ];
  
  // Use frame to check camera position and move floor planes
  useFrame(({ camera }) => {
    floorRefs.forEach((floorRef, i) => {
      if (floorRef.current) {
        // If the floor is too far ahead of the camera, move it behind
        if (floorRef.current.position.z > camera.position.z + 500) {
          floorRef.current.position.z -= 5000;
        }
      }
    });
  });

  return (
    <group>
      {floorRefs.map((ref, i) => (
        <mesh 
          key={i} 
          ref={ref} 
          rotation-x={-Math.PI / 2} 
          position={[0, 0, i * -1000]}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#1a1a1f" />
        </mesh>
      ))}
    </group>
  );
};

interface Scene3DProps {
  nodes: Node[];
  edges?: Edge[];
  onCreateEdge?: (sourceId: string, targetId: string) => void;
}

const Scene3D = ({ nodes, edges = [], onCreateEdge }: Scene3DProps) => {
  return (
    <div className="w-full h-full">
      <Canvas
        className="fixed inset-0"
        gl={{ 
          alpha: true,
          antialias: true,
          powerPreference: "high-performance" 
        }}
        dpr={[1, 2]}
        legacy={false}
        camera={{ position: [0, 2, 6], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#101010');
        }}
      >
        <color attach="background" args={["#101010"]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} />
        <CatwalkFloor />
        {nodes.length > 0 && (
          <InstancedNodes 
            nodes={nodes} 
            edges={edges}
            onCreateEdge={onCreateEdge}
          />
        )}
        <PointerLockControls />
      </Canvas>
    </div>
  );
};

export default Scene3D;
