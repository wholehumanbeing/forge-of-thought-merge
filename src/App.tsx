
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
