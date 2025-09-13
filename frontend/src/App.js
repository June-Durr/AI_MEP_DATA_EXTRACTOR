// src/App.js - Working version with regular CSS
import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

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

  const testAPI = async () => {
    setTesting(true);
    setTestResult("");

    try {
      const response = await fetch(process.env.REACT_APP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: "test",
          equipmentType: "hvac",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult(`✅ API Test Successful! Response: ${data.data}`);
      } else {
        setTestResult(
          `❌ API responded but with error: ${JSON.stringify(data)}`
        );
      }
    } catch (error) {
      setTestResult(`❌ API Test Failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="App">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="alert alert-warning text-center">
          📡 Offline Mode - Data will sync when connection restored
        </div>
      )}

      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🔧</span>
            <h2 style={{ margin: 0, color: "#333" }}>MEP Survey AI Agent</h2>
          </div>

          <div className="nav-links">
            <a href="#projects">Projects</a>
            <button
              className="btn btn-primary"
              onClick={() => alert("Camera coming soon!")}
            >
              📸 Scan Equipment
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        <div className="card text-center">
          <h1>🎉 MEP Survey AI Agent is Ready!</h1>
          <p style={{ fontSize: "18px", color: "#666", margin: "20px 0" }}>
            Your AI-powered equipment analysis tool for field surveys
          </p>

          {/* Status Information */}
          <div className="grid grid-2 mt-4">
            <div className="card" style={{ backgroundColor: "#f8f9fa" }}>
              <h3>🌐 Connection Status</h3>
              <p className={isOnline ? "status-online" : "status-offline"}>
                {isOnline ? "🟢 Online" : "🔴 Offline"}
              </p>
            </div>

            <div className="card" style={{ backgroundColor: "#f8f9fa" }}>
              <h3>🔧 API Configuration</h3>
              <p
                className={
                  process.env.REACT_APP_API_URL
                    ? "status-online"
                    : "status-offline"
                }
              >
                {process.env.REACT_APP_API_URL ? "✅ Configured" : "❌ Not Set"}
              </p>
              {process.env.REACT_APP_API_URL && (
                <small style={{ color: "#666", wordBreak: "break-all" }}>
                  {process.env.REACT_APP_API_URL}
                </small>
              )}
            </div>
          </div>

          {/* API Test Section */}
          <div className="card mt-4">
            <h3>🧪 Test Your API Connection</h3>
            <p>Test your AWS Lambda function that analyzes equipment images</p>

            <button
              className="btn btn-success"
              onClick={testAPI}
              disabled={testing || !process.env.REACT_APP_API_URL}
              style={{
                marginBottom: "20px",
                opacity: !process.env.REACT_APP_API_URL || testing ? 0.6 : 1,
              }}
            >
              {testing ? "🔄 Testing..." : "🧪 Test API Connection"}
            </button>

            {testResult && (
              <div
                className="card"
                style={{
                  backgroundColor: testResult.includes("✅")
                    ? "#d4edda"
                    : "#f8d7da",
                  color: testResult.includes("✅") ? "#155724" : "#721c24",
                  border: `1px solid ${
                    testResult.includes("✅") ? "#c3e6cb" : "#f5c6cb"
                  }`,
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                  }}
                >
                  {testResult}
                </pre>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="card mt-4" style={{ textAlign: "left" }}>
            <h3>📋 Next Steps:</h3>
            <ol style={{ padding: "0 20px" }}>
              <li>
                <strong>Test API Connection</strong> - Click the test button
                above
              </li>
              <li>
                <strong>Add Camera Component</strong> - For capturing equipment
                photos
              </li>
              <li>
                <strong>Create Project Management</strong> - Organize your
                surveys
              </li>
              <li>
                <strong>Build Equipment Analysis</strong> - Parse AI responses
              </li>
              <li>
                <strong>Generate Reports</strong> - Professional MEP reports
              </li>
            </ol>
          </div>

          {/* Features Preview */}
          <div className="grid grid-2 mt-4">
            <div className="card">
              <h4>📸 Camera Scanner</h4>
              <p>Capture equipment nameplates with your phone camera</p>
              <button
                className="btn btn-primary"
                disabled
                style={{ opacity: 0.6 }}
              >
                Coming Soon
              </button>
            </div>

            <div className="card">
              <h4>🤖 AI Analysis</h4>
              <p>Extract model numbers, serial numbers, and specifications</p>
              <button
                className="btn btn-primary"
                disabled
                style={{ opacity: 0.6 }}
              >
                Coming Soon
              </button>
            </div>

            <div className="card">
              <h4>📊 Project Management</h4>
              <p>Organize surveys by project with progress tracking</p>
              <button
                className="btn btn-primary"
                disabled
                style={{ opacity: 0.6 }}
              >
                Coming Soon
              </button>
            </div>

            <div className="card">
              <h4>📄 Report Generation</h4>
              <p>Generate professional MEP reports automatically</p>
              <button
                className="btn btn-primary"
                disabled
                style={{ opacity: 0.6 }}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}
      >
        <p>Schnackel Engineers - MEP Survey AI Agent</p>
        <p style={{ fontSize: "14px", marginTop: "10px" }}>
          Built for fieldwork • Powered by AWS • Enhanced by AI
        </p>
      </footer>
    </div>
  );
}

export default App;
