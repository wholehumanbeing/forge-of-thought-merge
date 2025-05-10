import { FC, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Simple 2D / 3D view-mode toggle button.
 *
 * – Reads current mode from the URL as single source of truth.
 * – Persists the selected mode in localStorage (key: `viewMode`).
 * – Navigates to the sibling route when toggled.
 */
const ViewToggle: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Determine current mode based on pathname prefix
  const [mode, setMode] = useState<"2d" | "3d">(
    location.pathname.startsWith("/2d") ? "2d" : "3d",
  );

  // Keep internal state in sync with the URL (e.g., browser nav)
  useEffect(() => {
    setMode(location.pathname.startsWith("/2d") ? "2d" : "3d");
  }, [location.pathname]);

  const toggleMode = () => {
    const newMode = mode === "3d" ? "2d" : "3d";
    // Persist selection so we can restore on next visit
    try {
      localStorage.setItem("viewMode", newMode);
    } catch (_) {
      /* ignore storage errors (e.g., Safari private mode) */
    }
    navigate(`/${newMode}`);
  };

  return (
    <button
      aria-label="Toggle between 2D and 3D views"
      className="px-3 py-1 rounded-md bg-forge-dark/70 text-forge-light hover:bg-forge-dark/90 text-sm font-medium"
      onClick={toggleMode}
    >
      {mode === "3d" ? "2D" : "3D"}
    </button>
  );
};

export default ViewToggle; 