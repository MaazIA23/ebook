import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./store/AuthContext";
import { CartProvider } from "./store/CartContext";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Une erreur s&apos;est produite</h1>
            <p style={{ marginBottom: "1rem" }}>Rechargez la page pour réessayer.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: "0.5rem 1rem", cursor: "pointer", borderRadius: "8px", border: "1px solid #1e40af", background: "#1e40af", color: "#fff" }}>
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);