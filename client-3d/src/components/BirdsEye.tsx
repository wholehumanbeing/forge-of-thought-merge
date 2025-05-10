import { lazy, Suspense } from "react";

// Import the 2D flow visualization from the client directory
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const CanvasPage = lazy(() => import("@2d/pages/CanvasPage"));

const BirdsEye = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-forge-dark text-white">Loading 2D visualization...</div>}>
      <CanvasPage />
    </Suspense>
  );
};

export default BirdsEye; 