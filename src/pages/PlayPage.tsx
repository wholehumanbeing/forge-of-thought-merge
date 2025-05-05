
import { Link } from "react-router-dom";

const PlayPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark">
      <h1 className="text-lg text-forge-light">Forge of Thought – WIP</h1>
      <Link 
        to="/" 
        className="mt-4 text-forge-primary hover:text-forge-accent transition-colors duration-300"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default PlayPage;
