
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from 'three';

console.log('THREE revision', THREE.REVISION); // Debug to check Three.js version

const Box = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
};

const Scene3D = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        gl={{ 
          alpha: true,
          antialias: true,
          powerPreference: "high-performance" 
        }}
        dpr={[1, 2]} // Responsive pixel ratio
        legacy={false} // Use modern WebGLRenderer features
        camera={{ position: [0, 0, 5], fov: 45 }}
        onCreated={({ gl }) => {
          // Explicit initialization to ensure correct context
          gl.setClearColor('#101010');
        }}
      >
        <color attach="background" args={["#101010"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Box />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default Scene3D;
