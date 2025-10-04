// frontend/src/components/Camera.js - Multi-RTU Survey System
import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Camera = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [captureMethod, setCaptureMethod] = useState("camera");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Project and RTU state
  const [project, setProject] = useState(null);
  const [projectRTUs, setProjectRTUs] = useState([]);
  const [currentRTUNumber, setCurrentRTUNumber] = useState(1);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = () => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const foundProject = projects.find((p) => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
        const rtus = foundProject.rtus || [];
        setProjectRTUs(rtus);
        setCurrentRTUNumber(rtus.length + 1);
      }
    }
  };

  const saveRTUToProject = (rtuData) => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex !== -1) {
        const rtu = {
          id: `rtu-${Date.now()}`,
          number: currentRTUNumber,
          data: rtuData,
          image: capturedImage,
          capturedAt: new Date().toISOString(),
        };

        if (!projects[projectIndex].rtus) {
          projects[projectIndex].rtus = [];
        }

        projects[projectIndex].rtus.push(rtu);
        projects[projectIndex].lastModified = new Date().toISOString();

        localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

        setProjectRTUs(projects[projectIndex].rtus);
        return true;
      }
    }
    return false;
  };

  // Clean up camera
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      setVideoReady(false);
      setCameraStarted(true);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = videoRef.current;

      video.srcObject = null;
      video.load();
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.controls = false;

      const videoReadyPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Video timeout")),
          10000
        );

        const handleCanPlay = () => {
          clearTimeout(timeout);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          resolve();
        };

        const handleError = () => {
          clearTimeout(timeout);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          reject(new Error("Video error"));
        };

        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("error", handleError);
      });

      video.srcObject = newStream;
      await videoReadyPromise;

      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (playError) {
        // Will play on interaction
      }

      setTimeout(() => setVideoReady(true), 1000);
      setStream(newStream);
    } catch (error) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      let errorMessage = "Could not access camera. ";
      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera access.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera in use by another app.";
      } else {
        errorMessage += error.message;
      }

      setError(errorMessage);
      setCameraStarted(false);
      setVideoReady(false);
    }
  };

  const capturePhoto = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        setError("Camera not ready");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        try {
          await video.play();
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (e) {}
      }

      const videoWidth = video.videoWidth || video.clientWidth || 1280;
      const videoHeight = video.videoHeight || video.clientHeight || 720;

      if (videoWidth === 0 || videoHeight === 0) {
        setError("Video dimensions not available");
        return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      if (imageData.length < 1000) {
        setError("Failed to capture image");
        return;
      }

      setCapturedImage(imageData);
      stopCamera();
    } catch (error) {
      setError(`Capture failed: ${error.message}`);
    }
  };

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCapturedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadAndAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const apiUrl =
        process.env.REACT_APP_API_URL ||
        "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";
      const base64Data = capturedImage.split(",")[1];

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          equipmentType: "hvac",
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.success) {
        setExtractedData(responseData.data);
      } else {
        throw new Error(responseData.error || "Analysis failed");
      }
    } catch (error) {
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAndContinue = () => {
    if (saveRTUToProject(extractedData)) {
      // Reset for next RTU
      setCapturedImage(null);
      setExtractedData(null);
      setError(null);
      setCurrentRTUNumber(currentRTUNumber + 1);
    }
  };

  const completeAndGenerateReport = () => {
    if (extractedData) {
      saveRTUToProject(extractedData);
    }
    navigate(`/?report=${projectId}`);
  };

  if (!projectId) {
    return (
      <div className="container">
        <div
          className="card"
          style={{ textAlign: "center", padding: "60px 20px" }}
        >
          <h2>No Project Selected</h2>
          <p>Please select a project from the projects list.</p>
          <button
            onClick={() => navigate("/")}
            className="btn btn-primary"
            style={{ marginTop: "20px" }}
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Project Header */}
      {project && (
        <div
          className="card"
          style={{
            marginBottom: "20px",
            background: "#007bff",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 5px 0" }}>{project.name}</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Project #{project.projectNumber} • Capturing RTU #
                {currentRTUNumber}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold" }}>
                {projectRTUs.length}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                RTUs Captured
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="alert"
          style={{ backgroundColor: "#f8d7da", marginBottom: "20px" }}
        >
          <strong>Error: </strong>
          {error}
        </div>
      )}

      {!capturedImage ? (
        <div>
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 15px 0" }}>
              Capture RTU #{currentRTUNumber}:
            </h3>
            <div style={{ display: "flex", gap: "15px" }}>
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

            {captureMethod === "camera" && !cameraStarted && (
              <button
                onClick={startCamera}
                className="btn btn-primary"
                style={{ width: "100%", padding: "15px", marginTop: "15px" }}
              >
                📷 Open Camera
              </button>
            )}

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
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    right: "20px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    padding: "15px",
                    borderRadius: "10px",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: "0 0 5px 0" }}>
                    RTU #{currentRTUNumber}
                  </h3>
                  <p style={{ margin: 0 }}>Point camera at nameplate</p>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "40px",
                    left: "0",
                    right: "0",
                    display: "flex",
                    justifyContent: "center",
                    gap: "30px",
                  }}
                >
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
                    }}
                  >
                    ✕
                  </button>
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
                    }}
                  >
                    📸
                  </button>
                  <div style={{ width: "60px" }}></div>
                </div>

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
                  >
                    <div style={{ marginBottom: "15px" }}>
                      Starting camera...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
          <div className="card" style={{ padding: 0, marginBottom: "20px" }}>
            <img
              src={capturedImage}
              alt="RTU nameplate"
              style={{ width: "100%", maxHeight: "60vh", objectFit: "contain" }}
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
                🔄 Retake
              </button>
              <button
                onClick={uploadAndAnalyze}
                disabled={analyzing}
                className="btn btn-success"
                style={{ flex: 1, padding: "12px 24px" }}
              >
                {analyzing ? "Analyzing..." : "🤖 Analyze RTU"}
              </button>
            </div>
          ) : (
            <div>
              <div
                className="card"
                style={{ backgroundColor: "#d4edda", marginBottom: "20px" }}
              >
                <h3 style={{ margin: "0 0 15px 0" }}>
                  ✅ RTU #{currentRTUNumber} Analysis Complete
                </h3>
                <div className="card" style={{ backgroundColor: "white" }}>
                  {extractedData.manufacturer && (
                    <p>
                      <strong>Manufacturer:</strong>{" "}
                      {extractedData.manufacturer}
                    </p>
                  )}
                  {extractedData.model && (
                    <p>
                      <strong>Model:</strong> {extractedData.model}
                    </p>
                  )}
                  {extractedData.tonnage && (
                    <p>
                      <strong>Capacity:</strong> {extractedData.tonnage}
                    </p>
                  )}
                  {extractedData.manufacturingYear && (
                    <p>
                      <strong>Year:</strong> {extractedData.manufacturingYear}
                    </p>
                  )}
                  {extractedData.currentAge !== undefined && (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "4px",
                        backgroundColor:
                          extractedData.currentAge > 15 ? "#f8d7da" : "#d1ecf1",
                      }}
                    >
                      <p>
                        <strong>Age:</strong> {extractedData.currentAge} years
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {extractedData.serviceLifeAssessment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  onClick={saveAndContinue}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "15px" }}
                >
                  ✅ Save & Add RTU #{currentRTUNumber + 1}
                </button>
                <button
                  onClick={completeAndGenerateReport}
                  className="btn btn-success"
                  style={{ flex: 1, padding: "15px" }}
                >
                  📄 Complete Survey
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RTU Summary */}
      {projectRTUs.length > 0 && (
        <div className="card" style={{ marginTop: "30px" }}>
          <h3>Captured RTUs ({projectRTUs.length})</h3>
          {projectRTUs.map((rtu, index) => (
            <div
              key={rtu.id}
              style={{
                padding: "15px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                marginTop: "10px",
              }}
            >
              <strong>RTU #{rtu.number}:</strong> {rtu.data.manufacturer}{" "}
              {rtu.data.model} - {rtu.data.tonnage} (
              {rtu.data.manufacturingYear})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Camera;
