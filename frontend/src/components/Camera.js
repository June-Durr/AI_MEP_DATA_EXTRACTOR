// frontend/src/components/Camera.js - Multi-RTU Survey System with Fixes
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReportGenerator from "./ReportGenerator";

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

  // User input state - DEFAULT TO ELECTRIC
  const [userInputs, setUserInputs] = useState({
    condition: "Good",
    heatType: "Electric", // Changed default from "Gas" to "Electric"
    gasPipeSize: "",
  });

  // Project and RTU state
  const [project, setProject] = useState(null);
  const [projectRTUs, setProjectRTUs] = useState([]);
  const [currentRTUNumber, setCurrentRTUNumber] = useState(1);

  // Load project function wrapped in useCallback
  const loadProject = useCallback(() => {
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
  }, [projectId]);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  const saveRTUToProject = (rtuData) => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex !== -1) {
        const rtu = {
          id: `rtu-${Date.now()}`,
          number: currentRTUNumber,
          data: {
            ...rtuData,
            // Include user inputs with the AI data
            condition: userInputs.condition,
            heatType: userInputs.heatType,
            gasPipeSize:
              userInputs.heatType === "Gas" ? userInputs.gasPipeSize : null,
          },
          // REMOVED image storage to fix quota error
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
      // Reload project to get updated RTU count
      loadProject();
      // Reset user inputs to defaults
      setUserInputs({
        condition: "Good",
        heatType: "Electric",
        gasPipeSize: "",
      });
    }
  };

  const completeAndGenerateReport = () => {
    if (extractedData) {
      saveRTUToProject(extractedData);
    }
    navigate(`/?report=${projectId}`);
  };

  // Gas pipe size options
  const gasPipeSizes = ['3/4"', '1"', '1 1/4"', '1 1/2"'];

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

      {/* Two-column layout: Camera/Input on left, Live Survey on right */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Left Column - Camera and Input */}
        <div style={{ flex: projectRTUs.length > 0 || extractedData ? "0 0 50%" : "1" }}>
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
                    style={{
                      width: "100%",
                      padding: "15px",
                      marginTop: "15px",
                    }}
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
              <div
                className="card"
                style={{ padding: 0, marginBottom: "20px" }}
              >
                <img
                  src={capturedImage}
                  alt="RTU nameplate"
                  style={{
                    width: "100%",
                    maxHeight: "60vh",
                    objectFit: "contain",
                  }}
                />
              </div>

              {/* User Input Form - BEFORE analysis */}
              {!extractedData && (
                <div className="card" style={{ marginBottom: "20px" }}>
                  <h3 style={{ margin: "0 0 15px 0" }}>
                    Equipment Information:
                  </h3>

                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "500",
                      }}
                    >
                      Condition:
                    </label>
                    <select
                      value={userInputs.condition}
                      onChange={(e) =>
                        setUserInputs({
                          ...userInputs,
                          condition: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "16px",
                      }}
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "500",
                      }}
                    >
                      Heat Type:
                    </label>
                    <select
                      value={userInputs.heatType}
                      onChange={(e) =>
                        setUserInputs({
                          ...userInputs,
                          heatType: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "16px",
                      }}
                    >
                      <option value="Electric">Electric</option>
                      <option value="Gas">Gas</option>
                    </select>
                  </div>

                  {userInputs.heatType === "Gas" && (
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "500",
                        }}
                      >
                        Gas Pipe Size:
                      </label>
                      <select
                        value={userInputs.gasPipeSize}
                        onChange={(e) =>
                          setUserInputs({
                            ...userInputs,
                            gasPipeSize: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          fontSize: "16px",
                        }}
                      >
                        <option value="">Select pipe size...</option>
                        {gasPipeSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div
                    style={{ display: "flex", gap: "15px", marginTop: "20px" }}
                  >
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
                      disabled={
                        analyzing ||
                        (userInputs.heatType === "Gas" &&
                          !userInputs.gasPipeSize)
                      }
                      className="btn btn-success"
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        opacity:
                          analyzing ||
                          (userInputs.heatType === "Gas" &&
                            !userInputs.gasPipeSize)
                            ? 0.6
                            : 1,
                      }}
                    >
                      {analyzing ? "Analyzing..." : "🤖 Analyze Nameplate"}
                    </button>
                  </div>
                </div>
              )}

              {extractedData && (
                <div>
                  <div
                    className="card"
                    style={{ backgroundColor: "#d4edda", marginBottom: "20px" }}
                  >
                    <h3 style={{ margin: "0 0 15px 0" }}>
                      ✅ RTU #{currentRTUNumber} Analysis Complete
                    </h3>
                    <div className="card" style={{ backgroundColor: "white" }}>
                      <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
                        User Inputs:
                      </h4>
                      <p>
                        <strong>Condition:</strong> {userInputs.condition}
                      </p>
                      <p>
                        <strong>Heat Type:</strong> {userInputs.heatType}
                      </p>
                      {userInputs.heatType === "Gas" &&
                        userInputs.gasPipeSize && (
                          <p>
                            <strong>Gas Pipe Size:</strong>{" "}
                            {userInputs.gasPipeSize}
                          </p>
                        )}

                      <hr style={{ margin: "20px 0" }} />

                      <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
                        AI Extracted Data:
                      </h4>

                      {/* Basic Info Section */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Basic Information:
                        </h5>
                        <p>
                          <strong>Manufacturer:</strong>{" "}
                          {extractedData.basicInfo?.manufacturer ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>Model:</strong>{" "}
                          {extractedData.basicInfo?.model || "Not Available"}
                        </p>
                        <p>
                          <strong>Serial Number:</strong>{" "}
                          {extractedData.basicInfo?.serialNumber ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>Manufacturing Year:</strong>{" "}
                          {extractedData.basicInfo?.manufacturingYear ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>Current Age:</strong>{" "}
                          {extractedData.basicInfo?.currentAge
                            ? `${extractedData.basicInfo.currentAge} years`
                            : "Not Available"}
                        </p>
                      </div>

                      {/* Electrical Info */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Electrical Information:
                        </h5>
                        <p>
                          <strong>Voltage:</strong>{" "}
                          {extractedData.electrical?.voltage || "Not Available"}
                        </p>
                        <p>
                          <strong>Phase:</strong>{" "}
                          {extractedData.electrical?.phase || "Not Available"}
                        </p>
                        <p>
                          <strong>Disconnect Size:</strong>{" "}
                          {extractedData.electrical?.disconnectSize ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>Fuse Size:</strong>{" "}
                          {extractedData.electrical?.fuseSize ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>KW:</strong>{" "}
                          {extractedData.electrical?.kw || "Not Available"}
                        </p>
                      </div>

                      {/* Compressor Info */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Compressor 1:
                        </h5>
                        <p>
                          <strong>Quantity:</strong>{" "}
                          {extractedData.compressor1?.quantity ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>RLA:</strong>{" "}
                          {extractedData.compressor1?.rla || "Not Available"}
                        </p>
                        <p>
                          <strong>LRA:</strong>{" "}
                          {extractedData.compressor1?.lra || "Not Available"}
                        </p>
                        <p>
                          <strong>MCA:</strong>{" "}
                          {extractedData.compressor1?.mca || "Not Available"}
                        </p>
                      </div>

                      {/* Compressor 2 Info */}
                      {extractedData.compressor2 && (
                        <div style={{ marginBottom: "20px" }}>
                          <h5 style={{ color: "#666", margin: "10px 0" }}>
                            Compressor 2:
                          </h5>
                          <p>
                            <strong>Quantity:</strong>{" "}
                            {extractedData.compressor2?.quantity ||
                              "Not Available"}
                          </p>
                          <p>
                            <strong>RLA:</strong>{" "}
                            {extractedData.compressor2?.rla || "Not Available"}
                          </p>
                          <p>
                            <strong>LRA:</strong>{" "}
                            {extractedData.compressor2?.lra || "Not Available"}
                          </p>
                          <p>
                            <strong>MOCP:</strong>{" "}
                            {extractedData.compressor2?.mocp || "Not Available"}
                          </p>
                        </div>
                      )}

                      {/* Condenser Fan Motor */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Condenser Fan Motor:
                        </h5>
                        <p>
                          <strong>Quantity:</strong>{" "}
                          {extractedData.condenserFanMotor?.quantity ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>HP:</strong>{" "}
                          {extractedData.condenserFanMotor?.hp ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>FLA:</strong>{" "}
                          {extractedData.condenserFanMotor?.fla ||
                            "Not Available"}
                        </p>
                      </div>

                      {/* Indoor Fan Motor */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Indoor Fan Motor:
                        </h5>
                        <p>
                          <strong>Quantity:</strong>{" "}
                          {extractedData.indoorFanMotor?.quantity ||
                            "Not Available"}
                        </p>
                        <p>
                          <strong>HP:</strong>{" "}
                          {extractedData.indoorFanMotor?.hp || "Not Available"}
                        </p>
                        <p>
                          <strong>FLA:</strong>{" "}
                          {extractedData.indoorFanMotor?.fla || "Not Available"}
                        </p>
                      </div>

                      {/* Gas Information */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Gas Information:
                        </h5>
                        <p>
                          <strong>Gas Type:</strong>{" "}
                          {userInputs.heatType === "Electric"
                            ? "N/A"
                            : extractedData.gasInformation?.gasType ||
                              "Not Available"}
                        </p>
                        <p>
                          <strong>Input Min BTU:</strong>{" "}
                          {userInputs.heatType === "Electric"
                            ? "N/A"
                            : extractedData.gasInformation?.inputMinBTU ||
                              "Not Available"}
                        </p>
                        <p>
                          <strong>Input Max BTU:</strong>{" "}
                          {userInputs.heatType === "Electric"
                            ? "N/A"
                            : extractedData.gasInformation?.inputMaxBTU ||
                              "Not Available"}
                        </p>
                        <p>
                          <strong>Output Capacity BTU:</strong>{" "}
                          {userInputs.heatType === "Electric"
                            ? "N/A"
                            : extractedData.gasInformation?.outputCapacityBTU ||
                              "Not Available"}
                        </p>
                      </div>

                      {/* Cooling Info */}
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#666", margin: "10px 0" }}>
                          Cooling Information:
                        </h5>
                        <p>
                          <strong>Tonnage:</strong>{" "}
                          {extractedData.cooling?.tonnage || "Not Available"}
                        </p>
                        <p>
                          <strong>Refrigerant:</strong>{" "}
                          {extractedData.cooling?.refrigerant ||
                            "Not Available"}
                        </p>
                      </div>

                      {/* Service Life Assessment */}
                      <div
                        style={{
                          padding: "15px",
                          borderRadius: "4px",
                          backgroundColor:
                            extractedData.basicInfo?.currentAge > 15
                              ? "#f8d7da"
                              : "#d1ecf1",
                          marginTop: "20px",
                        }}
                      >
                        <h5 style={{ margin: "0 0 10px 0" }}>
                          Service Life Assessment:
                        </h5>
                        <p style={{ margin: "5px 0" }}>
                          <strong>Status:</strong>{" "}
                          {extractedData.serviceLife?.assessment ||
                            "Unable to determine"}
                        </p>
                        <p style={{ margin: "5px 0" }}>
                          <strong>Recommendation:</strong>{" "}
                          {extractedData.serviceLife?.recommendation ||
                            "Further evaluation needed"}
                        </p>
                        <p
                          style={{
                            margin: "5px 0",
                            fontSize: "14px",
                            fontStyle: "italic",
                          }}
                        >
                          {extractedData.serviceLife?.ashrae_standard ||
                            "ASHRAE median service life for RTU: 15 years"}
                        </p>
                      </div>

                      {/* Warnings */}
                      {extractedData.warnings &&
                        extractedData.warnings.length > 0 && (
                          <div
                            style={{
                              padding: "15px",
                              borderRadius: "4px",
                              backgroundColor: "#fff3cd",
                              marginTop: "20px",
                            }}
                          >
                            <h5
                              style={{ margin: "0 0 10px 0", color: "#856404" }}
                            >
                              ⚠️ Warnings:
                            </h5>
                            <ul style={{ margin: 0, paddingLeft: "20px" }}>
                              {extractedData.warnings.map((warning, index) => (
                                <li key={index} style={{ color: "#856404" }}>
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* AI Confidence Level */}
                      {extractedData.overallConfidence && (
                        <div
                          style={{
                            marginTop: "20px",
                            textAlign: "right",
                            fontSize: "14px",
                            color: "#666",
                          }}
                        >
                          <strong>AI Confidence:</strong>{" "}
                          {extractedData.overallConfidence}
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
        </div>
        {/* End Left Column */}

        {/* Right Column - Live Report Preview */}
        {(projectRTUs.length > 0 || extractedData) && (
          <div
            style={{
              flex: "0 0 48%",
              position: "sticky",
              top: "20px",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
          >
            <ReportGenerator
              project={project}
              squareFootage={project?.squareFootage}
              isLivePreview={true}
              currentExtractedData={extractedData}
              currentRTUNumber={currentRTUNumber}
              currentUserInputs={userInputs}
            />
          </div>
        )}
        {/* End Right Column */}
      </div>
    </div>
  );
};

export default Camera;
