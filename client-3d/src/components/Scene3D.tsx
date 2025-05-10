import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from 'three';
import { useRef, useState, useEffect } from "react";
import InstancedNodes from "./InstancedNodes";
import { Node, Edge } from "@/store/useForgeStore";

console.log('THREE revision', THREE.REVISION); // Debug to check Three.js version

// WASD movement component
const WASDControls = () => {
  const { camera } = useThree();
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    // Add key listeners
    const onKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW':
          keys.current.forward = true;
          break;
        case 'KeyS':
          keys.current.backward = true;
          break;
        case 'KeyA':
          keys.current.left = true;
          break;
        case 'KeyD':
          keys.current.right = true;
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW':
          keys.current.forward = false;
          break;
        case 'KeyS':
          keys.current.backward = false;
          break;
        case 'KeyA':
          keys.current.left = false;
          break;
        case 'KeyD':
          keys.current.right = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame(() => {
    // WASD movement
    const moveSpeed = 0.15;
    const forwardVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();
    
    // Get the camera's current world direction
    camera.getWorldDirection(forwardVector);
    // Project onto XZ plane and normalize for ground movement
    forwardVector.y = 0;
    forwardVector.normalize();

    // Calculate the side vector (for strafing)
    // Cross product of camera's up vector (0,1,0) and forward vector
    sideVector.crossVectors(camera.up, forwardVector).normalize();

    const actualMoveDirection = new THREE.Vector3();

    if (keys.current.forward) {
      actualMoveDirection.add(forwardVector);
    }
    if (keys.current.backward) {
      actualMoveDirection.sub(forwardVector);
    }
    if (keys.current.left) {
      // Note: In THREE.js, positive X is to the right of the camera's default view.
      // If PointerLockControls inverts this or if you want left to be truly left of view:
      actualMoveDirection.sub(sideVector);
    }
    if (keys.current.right) {
      actualMoveDirection.add(sideVector);
    }

    if (actualMoveDirection.lengthSq() > 0) { // Use lengthSq for efficiency
      actualMoveDirection.normalize();
      camera.position.addScaledVector(actualMoveDirection, moveSpeed);
    }
  });

  return null;
};

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
          position={[0, 0, i * -1000]}
          rotation={[-Math.PI / 2, 0, 0]} // Direct rotation prop instead of primitive
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
  onSelectNode?: (nodeId: string) => void;
  selectedNodeIds?: string[];
  synthesizing?: boolean;
  controlsLocked?: boolean;
  onControlsLock?: () => void;
  onControlsUnlock?: () => void;
}

const Scene3D = ({ 
  nodes, 
  edges = [], 
  onCreateEdge, 
  onSelectNode, 
  selectedNodeIds = [], 
  synthesizing = false,
  controlsLocked = false,
  onControlsLock,
  onControlsUnlock
}: Scene3DProps) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const controlsRef = useRef(null);

  // Show instructions when controls are locked
  useEffect(() => {
    if (controlsLocked) {
      setShowInstructions(true);
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [controlsLocked]);

  return (
    <div className="w-full h-full">
      {showInstructions && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white p-2 rounded z-10 text-center">
          Use WASD to move, Esc to unlock controls
        </div>
      )}
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
            onSelectNode={onSelectNode}
            selectedNodeIds={selectedNodeIds}
            synthesizing={synthesizing}
          />
        )}
        {controlsLocked && <WASDControls />}
        <PointerLockControls 
          ref={controlsRef}
          enabled={controlsLocked}
          onLock={() => onControlsLock?.()}
          onUnlock={() => onControlsUnlock?.()}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;
