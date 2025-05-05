
import Scene3D from "./Scene3D";

const CatwalkScene = () => {
  return (
    <div className="w-full h-screen">
      <Scene3D />
      <div className="absolute top-4 left-4 bg-forge-dark/70 p-2 rounded">
        <h2 className="text-lg text-forge-light">Forge of Thought</h2>
      </div>
    </div>
  );
};

export default CatwalkScene;
