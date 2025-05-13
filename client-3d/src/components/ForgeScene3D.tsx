import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import * as THREE from 'three';
import InstancedNodes from "./InstancedNodes";
import { Node, Edge } from "@/types/graph";
import ConceptNode from "./nodes/ConceptNode";
import SpaceBackground from "./SpaceBackground";

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

  useFrame((state, delta) => {
    // WASD movement
    const moveSpeed = 5;
    const direction = new THREE.Vector3();
    const rotation = camera.rotation.clone();

    if (keys.current.forward) {
      direction.z = -1;
    }
    if (keys.current.backward) {
      direction.z = 1;
    }
    if (keys.current.left) {
      direction.x = -1;
    }
    if (keys.current.right) {
      direction.x = 1;
    }

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyEuler(new THREE.Euler(0, rotation.y, 0));
      camera.position.addScaledVector(direction, moveSpeed * delta);
    }
  });

  return null;
};

interface ForgeScene3DProps {
  nodes: Node[];
  edges?: Edge[];
  onCreateEdge?: (sourceId: string, targetId: string) => void;
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  synthesizing?: boolean;
  controlsLocked?: boolean;
  onControlsLock?: () => void;
  onControlsUnlock?: () => void;
}

const ForgeScene3D: React.FC<ForgeScene3DProps> = ({
  nodes,
  edges = [],
  onCreateEdge,
  onSelectNode,
  selectedNodeId = null,
  synthesizing = false,
  controlsLocked = false,
  onControlsLock,
  onControlsUnlock,
}) => {
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
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        camera={{ position: [0, 2, 6], fov: 45 }}
      >
        {/* Cosmic space background */}
        <SpaceBackground starsCount={3000} depth={400} />

        {/* Basic lighting - reduced intensity to fit cosmic theme */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={0.7} />

        {/* Individual ConceptNode rendering */}
        {nodes.map((node) => (
          <ConceptNode
            key={node.id}
            node={node}
            onClick={onSelectNode}
            isSelected={node.id === selectedNodeId}
          />
        ))}

        {/* Navigation controls */}
        <OrbitControls makeDefault enableDamping enableZoom={true} enablePan={true} enabled={!controlsLocked} />
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

export default ForgeScene3D; 