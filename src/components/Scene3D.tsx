
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const Scene3D = () => {
  return (
    <div className="w-full h-full">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </Canvas>
    </div>
  );
};

export default Scene3D;
