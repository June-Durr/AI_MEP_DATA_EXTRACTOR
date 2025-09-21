// Enhanced Camera workflow with cost tracking and retake functionality
import React, { useRef, useState, useCallback } from "react";

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [captureMethod, setCaptureMethod] = useState("camera");
  const [costInfo, setCostInfo] = useState(null);
  const [sessionCosts, setSessionCosts] = useState([]);

  // ... existing camera functions ...
  console.log("API URL:", process.env.REACT_APP_API_URL);

  // Enhanced upload and analyze with cost tracking
  // Find your uploadAndAnalyze function in Camera.js and modify it like this:

  const uploadAndAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    // 🔍 ADD THIS DEBUG ALERT HERE - AT THE VERY BEGINNING
    alert("API URL: " + process.env.REACT_APP_API_URL);
    console.log("API URL:", process.env.REACT_APP_API_URL);
    console.log("All env vars:", process.env);

    try {
      const base64Data = capturedImage.split(",")[1];
      const startTime = Date.now();

      // 🔍 ADD MORE DEBUG INFO
      console.log("About to call API...");
      console.log("Image size:", base64Data.length);

      const response = await fetch(process.env.REACT_APP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          equipmentType: "hvac",
        }),
      });

      // 🔍 LOG RESPONSE DETAILS
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const analysisTime = Date.now() - startTime;

      console.log("Success! Response:", responseData);

      if (responseData.success) {
        setExtractedData(responseData.data);
        setCostInfo(responseData.estimatedCost);

        // Track session costs (your existing code)
        const newCost = {
          timestamp: new Date().toLocaleTimeString(),
          cost: responseData.estimatedCost?.estimatedCostUSD || "0.0008",
          analysisTime: `${analysisTime}ms`,
        };
        setSessionCosts((prev) => [...prev, newCost]);
      } else {
        throw new Error(responseData.error || "Analysis failed");
      }
    } catch (error) {
      console.error("❌ Detailed error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Calculate session total
  const sessionTotal = sessionCosts
    .reduce((sum, cost) => sum + parseFloat(cost.cost), 0)
    .toFixed(4);

  return (
    <div className="container">
      {/* Cost Tracking Header */}
      <div
        className="card"
        style={{ marginBottom: "20px", background: "#f8f9fa" }}
      >
        <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
          💰 Cost Tracking
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            Session Total: <strong>${sessionTotal}</strong>
          </span>
          <span>
            Analyses: <strong>{sessionCosts.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div
        className="card"
        style={{ marginBottom: "20px", background: "#007bff", color: "white" }}
      >
        <h1 style={{ margin: "0 0 10px 0" }}>MEP Equipment Scanner</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Capture RTU nameplates for instant age analysis
        </p>
      </div>

      {error && (
        <div
          className="alert"
          style={{
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            color: "#721c24",
            marginBottom: "20px",
          }}
        >
          <strong>Error: </strong>
          {error}
        </div>
      )}

      {!capturedImage ? (
        // ... existing capture interface ...
        <div>
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 15px 0" }}>Choose Input Method:</h3>
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={() => {
                  setCaptureMethod("camera");
                  // startCamera();
                }}
                className="btn"
                style={{
                  flex: 1,
                  padding: "15px",
                  backgroundColor:
                    captureMethod === "camera" ? "#007bff" : "white",
                  color: captureMethod === "camera" ? "white" : "#333",
                  border: "2px solid #007bff",
                }}
              >
                📱 Use Camera
              </button>
              <button
                onClick={() => {
                  setCaptureMethod("upload");
                  fileInputRef.current?.click();
                }}
                className="btn"
                style={{
                  flex: 1,
                  padding: "15px",
                  backgroundColor:
                    captureMethod === "upload" ? "#28a745" : "white",
                  color: captureMethod === "upload" ? "white" : "#333",
                  border: "2px solid #28a745",
                }}
              >
                💻 Upload File
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => setCapturedImage(e.target.result);
                reader.readAsDataURL(file);
              }
            }}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div>
          {/* Image Preview */}
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden", marginBottom: "20px" }}
          >
            <img
              src={capturedImage}
              alt="Equipment nameplate"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "60vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {!extractedData ? (
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setError(null);
                }}
                className="btn"
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  padding: "12px 24px",
                }}
              >
                🔄 Retake Photo
              </button>

              <button
                onClick={uploadAndAnalyze}
                disabled={analyzing}
                className="btn btn-success"
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  opacity: analyzing ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {analyzing ? (
                  <>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        border: "2px solid transparent",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    Analyzing... (~$0.0008)
                  </>
                ) : (
                  "🤖 Analyze RTU (~$0.0008)"
                )}
              </button>
            </div>
          ) : (
            <div>
              {/* Results Display */}
              <div
                className="card"
                style={{
                  backgroundColor: "#d4edda",
                  border: "1px solid #c3e6cb",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ color: "#155724", margin: "0 0 15px 0" }}>
                  ✅ RTU Analysis Complete
                </h3>

                {/* Equipment Details */}
                <div
                  className="card"
                  style={{ backgroundColor: "white", border: "1px solid #ddd" }}
                >
                  <h4 style={{ margin: "0 0 15px 0" }}>Equipment Details:</h4>

                  {extractedData.manufacturer && (
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Manufacturer:</strong>{" "}
                      {extractedData.manufacturer}
                    </div>
                  )}

                  {extractedData.model && (
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Model:</strong> {extractedData.model}
                    </div>
                  )}

                  {extractedData.serialNumber && (
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Serial Number:</strong>{" "}
                      {extractedData.serialNumber}
                    </div>
                  )}

                  {extractedData.manufacturingYear && (
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Manufacturing Year:</strong>{" "}
                      {extractedData.manufacturingYear}
                    </div>
                  )}

                  {extractedData.currentAge !== undefined && (
                    <div
                      style={{
                        marginBottom: "10px",
                        padding: "10px",
                        borderRadius: "4px",
                        backgroundColor:
                          extractedData.currentAge > 15 ? "#f8d7da" : "#d1ecf1",
                        border:
                          extractedData.currentAge > 15
                            ? "1px solid #f5c6cb"
                            : "1px solid #bee5eb",
                      }}
                    >
                      <strong>Current Age:</strong> {extractedData.currentAge}{" "}
                      years
                      <br />
                      <strong>Service Life:</strong>{" "}
                      {extractedData.serviceLifeAssessment ||
                        (extractedData.currentAge > 15
                          ? "BEYOND SERVICE LIFE"
                          : "Within service life")}
                    </div>
                  )}

                  {extractedData.confidence && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        marginTop: "10px",
                      }}
                    >
                      <strong>Confidence:</strong> {extractedData.confidence}
                    </div>
                  )}
                </div>

                {/* Cost Info */}
                {costInfo && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#155724",
                      marginTop: "10px",
                    }}
                  >
                    Analysis Cost: ${costInfo.estimatedCostUSD} (
                    {costInfo.inputTokens} tokens)
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setExtractedData(null);
                    setError(null);
                  }}
                  className="btn btn-primary"
                  style={{ padding: "12px 24px" }}
                >
                  📸 Analyze Another RTU
                </button>

                <button
                  onClick={() => {
                    // Future: Save to project
                    alert("Ready to add project management!");
                  }}
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: "#fd7e14",
                    color: "white",
                    padding: "12px 24px",
                  }}
                >
                  💾 Save to Project (Coming Soon)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session History */}
      {sessionCosts.length > 0 && (
        <div
          className="card"
          style={{ marginTop: "20px", backgroundColor: "#f8f9fa" }}
        >
          <h4 style={{ margin: "0 0 10px 0" }}>📊 Session History</h4>
          {sessionCosts.map((cost, index) => (
            <div key={index} style={{ fontSize: "14px", marginBottom: "5px" }}>
              {cost.timestamp}: ${cost.cost} ({cost.analysisTime})
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Camera;
