import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark text-forge-light p-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-forge-primary to-forge-accent">
        Forge of Thought
      </h1>
      <p className="text-xl md:text-2xl mb-10 max-w-md text-center">
        An immersive 3D space to create, explore, and visualize your ideas
      </p>
      <Button 
        onClick={() => navigate("/3d")}
        className="bg-forge-primary hover:bg-forge-accent text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
      >
        Enter the Forge
      </Button>
    </div>
  );
};

export default HomePage;
