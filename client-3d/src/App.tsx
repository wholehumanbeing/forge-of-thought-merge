import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import GalaxyScene from "./components/CatwalkScene";
import BirdsEye from "./components/BirdsEye";
import useForgeStore from "./store/useForgeStore";

const App = () => {
  const { archetypeSymbols } = useForgeStore();
  const hasCompletedOnboarding = (archetypeSymbols ?? []).length > 0;

  return (
    <>
      {/* Global toaster for snackbars */}
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Default root redirects to onboarding or galaxy based on state */}
          <Route path="/" element={
            hasCompletedOnboarding 
              ? <Navigate to="/galaxy" replace /> 
              : <Navigate to="/onboarding" replace />
          } />

          {/* Onboarding route */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Galaxy view (renamed from CatwalkScene) */}
          <Route path="/galaxy" element={<GalaxyScene />} />

          {/* Birds-eye view imports from client directory */}
          <Route path="/birdseye" element={<BirdsEye />} />

          {/* Catch-all → redirect to default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
