import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useForgeStore from "@/store/useForgeStore";
import Onboarding from "./Onboarding";
import CatwalkScene from "@/components/CatwalkScene";

const PlayPage = () => {
  const { archetypeSymbols } = useForgeStore();
  const navigate = useNavigate();

  // If user has not selected archetypes, show Onboarding
  if (archetypeSymbols.length < 3) {
    return <Onboarding />;
  }

  // Otherwise, show the CatwalkScene
  return <CatwalkScene />;
};

export default PlayPage;
