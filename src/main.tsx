import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.info("[AppBoot] Application boot", {
  href: window.location.href,
});

createRoot(document.getElementById("root")!).render(<App />);
