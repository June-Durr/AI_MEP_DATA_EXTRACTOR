// src/components/Camera.js
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
  const [captureMethod, setCaptureMethod] = useState("camera"); // 'camera' or 'upload'

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setError(
        "Unable to access camera. Please use file upload instead or check camera permissions."
      );
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture photo from camera
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload and analyze with AI
  const uploadAndAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const base64Data = capturedImage.split(",")[1];

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.success) {
        setExtractedData({
          rawResponse: responseData.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(responseData.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset for new capture
  const resetCapture = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setError(null);
    if (captureMethod === "camera") {
      startCamera();
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container">
      <div
        className="card"
        style={{ marginBottom: "20px", background: "#007bff", color: "white" }}
      >
        <h1 style={{ margin: "0 0 10px 0" }}>MEP Equipment Scanner</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Capture or upload equipment nameplates for instant analysis
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
        <div>
          {/* Method Selection */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 15px 0" }}>Choose Input Method:</h3>
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={() => {
                  setCaptureMethod("camera");
                  startCamera();
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
                  stopCamera();
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {/* Camera View */}
          {captureMethod === "camera" && (
            <div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "60vh",
                    display: "block",
                  }}
                  onLoadedMetadata={startCamera}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="btn btn-primary"
                  style={{
                    fontSize: "18px",
                    padding: "15px 30px",
                    opacity: !stream ? 0.6 : 1,
                  }}
                >
                  📸 Capture Nameplate
                </button>
              </div>
            </div>
          )}

          {/* Upload Instructions */}
          {captureMethod === "upload" && (
            <div className="card text-center" style={{ padding: "40px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📁</div>
              <h3 style={{ marginBottom: "15px" }}>Upload Equipment Photo</h3>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Click "Upload File" above to select an image from your computer
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-success"
                style={{ padding: "12px 30px" }}
              >
                📎 Select Image File
              </button>
            </div>
          )}

          {/* Photo Tips */}
          <div
            className="card mt-4"
            style={{ backgroundColor: "#fff3cd", border: "1px solid #ffeaa7" }}
          >
            <h3 style={{ color: "#856404", margin: "0 0 15px 0" }}>
              📋 Photo Tips for Best Results:
            </h3>
            <ul style={{ color: "#856404", margin: 0, paddingLeft: "20px" }}>
              <li>
                Ensure nameplate is clearly visible and fills most of the frame
              </li>
              <li>Avoid glare and shadows on the nameplate</li>
              <li>Clean nameplate if dirty or weathered</li>
              <li>
                For uploads: Use high-resolution images (1MB+ recommended)
              </li>
              <li>Supported formats: JPG, PNG, HEIC</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
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
                onClick={resetCapture}
                className="btn"
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  padding: "12px 24px",
                }}
              >
                🔄 Try Another
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
                    Analyzing with AI...
                  </>
                ) : (
                  "🤖 Analyze Equipment"
                )}
              </button>
            </div>
          ) : (
            <div>
              <div
                className="card"
                style={{
                  backgroundColor: "#d4edda",
                  border: "1px solid #c3e6cb",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ color: "#155724", margin: "0 0 15px 0" }}>
                  ✅ Analysis Complete
                </h3>

                <div
                  className="card"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0" }}>
                    Extracted Equipment Data:
                  </h4>
                  <pre
                    style={{
                      fontSize: "14px",
                      color: "#333",
                      whiteSpace: "pre-wrap",
                      overflowX: "auto",
                      margin: 0,
                      fontFamily: "monospace",
                    }}
                  >
                    {extractedData.rawResponse}
                  </pre>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#155724",
                    margin: "10px 0 0 0",
                    opacity: 0.8,
                  }}
                >
                  Analyzed at:{" "}
                  {new Date(extractedData.timestamp).toLocaleString()}
                </p>
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  onClick={resetCapture}
                  className="btn btn-primary"
                  style={{ padding: "12px 24px" }}
                >
                  📸 Scan Another
                </button>

                <button
                  onClick={() => {
                    alert("Data saved! (Feature coming soon)");
                  }}
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: "#fd7e14",
                    color: "white",
                    padding: "12px 24px",
                  }}
                >
                  💾 Save to Survey
                </button>
              </div>
            </div>
          )}
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
