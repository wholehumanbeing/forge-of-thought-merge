
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useForgeStore from "@/store/useForgeStore";
import Onboarding from "./Onboarding";
import CatwalkScene from "@/components/CatwalkScene";
import { toast } from "react-hot-toast";
import { ErrorBoundary } from "react-error-boundary";

const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-forge-dark p-8 text-white">
    <h1 className="text-2xl font-bold mb-4">Something went wrong with the 3D scene</h1>
    <p className="mb-4">Error: {error.message}</p>
    <button 
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-forge-primary hover:bg-forge-accent rounded-md"
    >
      Try again
    </button>
  </div>
);

const PlayPage = () => {
  const { archetypeSymbols, initialized, setInitialized } = useForgeStore();
  const navigate = useNavigate();
  const [errorCount, setErrorCount] = useState(0);
  const [key, setKey] = useState(0); // Add a key to force remount the CatwalkScene

  useEffect(() => {
    // Check localStorage for persisted data
    if (archetypeSymbols.length > 0 && !initialized) {
      setInitialized(true);
      toast.success("Welcome back to your Forge of Thought");
    }
  }, [archetypeSymbols, initialized, setInitialized]);

  // If user has persisted archetypes, skip onboarding and show CatwalkScene with error boundary
  if (archetypeSymbols.length > 0) {
    return (
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onReset={() => {
          // Reset error count, increment key to force remount
          setErrorCount(prev => prev + 1);
          setKey(prevKey => prevKey + 1);
          
          // Force a clean reload if we've tried too many times
          if (errorCount >= 3) {
            window.location.reload();
          }
        }}
        resetKeys={[errorCount, key]}
      >
        <CatwalkScene key={key} />
      </ErrorBoundary>
    );
  }

  // Otherwise, show the Onboarding
  return <Onboarding />;
};

export default PlayPage;
