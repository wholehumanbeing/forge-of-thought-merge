
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark text-forge-light">
      <h1 className="text-4xl font-bold mb-6">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <Button 
        onClick={() => navigate("/")}
        className="bg-forge-primary hover:bg-forge-accent text-white font-bold py-2 px-6 rounded-lg transition-all duration-300"
      >
        Return Home
      </Button>
    </div>
  );
};

export default NotFound;
