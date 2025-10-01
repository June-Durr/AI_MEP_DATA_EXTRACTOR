// Production Camera component - cleaned up for field use
import React, { useRef, useState, useEffect } from "react";

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
  const [cameraStarted, setCameraStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Start camera function - iPhone Safari optimized
  const startCamera = async () => {
    try {
      setError(null);
      setVideoReady(false);
      setCameraStarted(true);

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      // Wait for React to render the video element
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not found after render delay");
      }

      // iPhone Safari optimized constraints
      const constraints = {
        video: {
          facingMode: { ideal: "environment" }, // Back camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = videoRef.current;

      // Configure video element
      video.srcObject = null;
      video.load();
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.controls = false;

      // Wait for video to be ready
      const videoReadyPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video loading timeout"));
        }, 10000);

        const handleCanPlay = () => {
          clearTimeout(timeout);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          resolve();
        };

        const handleError = (e) => {
          clearTimeout(timeout);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          reject(new Error("Video playback error"));
        };

        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("error", handleError);
      });

      video.srcObject = newStream;
      await videoReadyPromise;

      // Attempt to play video
      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (playError) {
        // Video will play on user interaction
      }

      // Final verification
      setTimeout(() => {
        setVideoReady(true);
      }, 1000);

      setStream(newStream);
    } catch (error) {
      // Clean up on error
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      let errorMessage = "Could not access camera. ";
      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found on device.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera is being used by another app.";
      } else {
        errorMessage += error.message;
      }

      setError(errorMessage);
      setCameraStarted(false);
      setVideoReady(false);
    }
  };

  // Capture photo function
  const capturePhoto = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        setError("Camera components not ready. Please try again.");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        try {
          await video.play();
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (e) {
          // Continue anyway
        }
      }

      const videoWidth = video.videoWidth || video.clientWidth || 1280;
      const videoHeight = video.videoHeight || video.clientHeight || 720;

      if (videoWidth === 0 || videoHeight === 0) {
        setError(
          "Video dimensions not available. Please wait for camera to fully load."
        );
        return;
      }

      // Set canvas to video size and draw frame
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      if (imageData.length < 1000) {
        setError(
          "Failed to capture image. Please ensure camera is working and try again."
        );
        return;
      }

      setCapturedImage(imageData);
      stopCamera();
    } catch (error) {
      setError(`Failed to take photo: ${error.message}. Please try again.`);
    }
  };

  // Force video play on user interaction (for Safari)
  const forceVideoPlay = async () => {
    if (videoRef.current && !videoReady) {
      try {
        await videoRef.current.play();
        setVideoReady(true);
      } catch (e) {
        // Ignore
      }
    }
  };

  // Stop camera function
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
    setVideoReady(false);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCapturedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Analyze RTU nameplate
  const uploadAndAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      // API URL with fallback
      const apiUrl =
        process.env.REACT_APP_API_URL ||
        "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";
      const base64Data = capturedImage.split(",")[1];
      const startTime = Date.now();

      const response = await fetch(apiUrl, {
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
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      const analysisTime = Date.now() - startTime;

      if (responseData.success) {
        setExtractedData(responseData.data);
        setCostInfo(responseData.estimatedCost);

        // Track session costs
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
        <div>
          {/* Input Method Selection */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 15px 0" }}>Choose Input Method:</h3>
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
              <button
                onClick={() => setCaptureMethod("camera")}
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

            {/* Camera Interface */}
            {captureMethod === "camera" && (
              <div>
                {!cameraStarted ? (
                  <button
                    onClick={startCamera}
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "15px", fontSize: "18px" }}
                  >
                    📷 Open Camera
                  </button>
                ) : null}

                {/* Full-Screen Camera */}
                {cameraStarted && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      backgroundColor: "#000",
                      zIndex: 9999,
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onTouchStart={forceVideoPlay}
                    onClick={forceVideoPlay}
                  >
                    {/* Camera Video */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        backgroundColor: "#000",
                      }}
                    />

                    {/* Top Navigation */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50px",
                        left: "20px",
                        right: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "white",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        padding: "10px 15px",
                        borderRadius: "10px",
                      }}
                    >
                      <button
                        onClick={stopCamera}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "white",
                          fontSize: "16px",
                          cursor: "pointer",
                        }}
                      >
                        ← Back
                      </button>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "center",
                        }}
                      >
                        Point camera at RTU nameplate
                      </div>
                      <div style={{ width: "50px" }}></div>
                    </div>

                    {/* Camera Controls */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "120px",
                        left: "0",
                        right: "0",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "40px",
                        padding: "0 30px",
                      }}
                    >
                      {/* Cancel Button */}
                      <button
                        onClick={stopCamera}
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.3)",
                          border: "2px solid white",
                          color: "white",
                          fontSize: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>

                      {/* Capture Button */}
                      <button
                        onClick={capturePhoto}
                        disabled={!videoReady}
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "50%",
                          backgroundColor: videoReady
                            ? "white"
                            : "rgba(255,255,255,0.5)",
                          border: "4px solid white",
                          cursor: videoReady ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "32px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        📸
                      </button>

                      {/* Spacer */}
                      <div style={{ width: "60px", height: "60px" }}></div>
                    </div>

                    {/* Loading indicator */}
                    {!videoReady && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          color: "white",
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: "30px",
                          borderRadius: "15px",
                          textAlign: "center",
                        }}
                        onTouchStart={forceVideoPlay}
                        onClick={forceVideoPlay}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            border: "3px solid rgba(255,255,255,0.3)",
                            borderTop: "3px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto 15px auto",
                          }}
                        ></div>
                        <div style={{ fontSize: "16px", marginBottom: "10px" }}>
                          Starting camera...
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.8 }}>
                          Tap here if nothing happens
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden Elements */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
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
