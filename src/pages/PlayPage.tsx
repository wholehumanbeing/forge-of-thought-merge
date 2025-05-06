import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useForgeStore from "@/store/useForgeStore";
import Onboarding from "./Onboarding";
import CatwalkScene from "@/components/CatwalkScene";
import { toast } from "react-hot-toast";

const PlayPage = () => {
  const { archetypeSymbols, initialized, setInitialized } = useForgeStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage for persisted data
    if (archetypeSymbols.length > 0 && !initialized) {
      setInitialized(true);
      toast.success("Welcome back to your Forge of Thought");
    }
  }, [archetypeSymbols, initialized, setInitialized]);

  // If user has persisted archetypes, skip onboarding
  if (archetypeSymbols.length > 0) {
    return <CatwalkScene />;
  }

  // Otherwise, show the Onboarding
  return <Onboarding />;
};

export default PlayPage;
