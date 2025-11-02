// src/App.js - Updated with routing
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import Camera from "./components/Camera";
import ElectricalSurvey from "./components/ElectricalSurvey";
import ProjectList from "./components/ProjectList";
import "./App.css";

function AppContent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiConnected, setApiConnected] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Offline Indicator */}
      {!isOnline && (
        <div
          className="alert alert-warning text-center"
          style={{ margin: 0, borderRadius: 0 }}
        >
          📡 Offline Mode - Data will sync when connection restored
        </div>
      )}

      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🔧</span>
            <span style={{ fontWeight: "600", color: "#333" }}>
              MEP Survey AI
            </span>
          </Link>

          <div className="nav-links">
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: location.pathname === "/" ? "#007bff" : "#666",
                fontWeight: location.pathname === "/" ? "500" : "normal",
              }}
            >
              Projects
            </Link>
            <Link
              to="/camera"
              className="btn btn-primary"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                padding: "8px 16px",
              }}
            >
              📸 Scan Equipment
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/camera/:projectId" element={<Camera />} />
        <Route path="/electrical/:projectId" element={<ElectricalSurvey />} />
      </Routes>

      {/* Footer */}
      <footer
        style={{
          marginTop: "60px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ margin: "0 0 10px 0" }}>
            MEP Survey AI Agent
          </p>
          <p style={{ margin: 0 }}>
            Status: {isOnline ? "🟢 Online" : "🔴 Offline"} | API:{" "}
            {apiConnected ? "✅ Connected" : "❌ Disconnected"} |
            Built for fieldwork • Powered by AWS • Enhanced by AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
