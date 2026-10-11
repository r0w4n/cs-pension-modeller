import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import { QuickCalculatorPage } from "./quick-calculator-page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QuickCalculatorPage />
  </StrictMode>
);
