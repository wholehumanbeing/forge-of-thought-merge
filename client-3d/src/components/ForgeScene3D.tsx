/// <reference types="@react-three/fiber" />
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import InstancedNodes from "./InstancedNodes";
import { Node, Edge } from "@/store/useForgeStore";

interface ForgeScene3DProps {
  nodes: Node[];
  edges?: Edge[];
  onCreateEdge?: (sourceId: string, targetId: string) => void;
  onSelectNode?: (nodeId: string) => void;
  selectedNodeIds?: string[];
  synthesizing?: boolean;
}

const ForgeScene3D: React.FC<ForgeScene3DProps> = ({
  nodes,
  edges = [],
  onCreateEdge,
  onSelectNode,
  selectedNodeIds = [],
  synthesizing = false,
}) => {
  return (
    <div className="w-full h-full">
      <Canvas
        className="fixed inset-0"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        camera={{ position: [0, 2, 6], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#101010");
        }}
      >
        {/* Scene background */}
        <color attach="background" args={["#101010"]} />
        {/* Basic lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={1} />

        {/* Instanced node rendering */}
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

        {/* Navigation controls */}
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
};

export default ForgeScene3D; 