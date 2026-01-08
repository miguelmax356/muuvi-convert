import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import ShortRedirect from "./pages/ShortRedirect";
import "./index.css";

const isShortRoute = window.location.pathname.startsWith("/s/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>{isShortRoute ? <ShortRedirect /> : <App />}</AuthProvider>
  </StrictMode>
);
