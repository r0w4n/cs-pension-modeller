import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initialiseAnalytics } from "./analytics";
import App from "./App";
import "./index.css";

initialiseAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
