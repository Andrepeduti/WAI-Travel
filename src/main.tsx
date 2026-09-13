import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalImageFallback } from "./lib/imageFallback";
import { ErrorBoundary } from "./ErrorBoundary";

installGlobalImageFallback();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
