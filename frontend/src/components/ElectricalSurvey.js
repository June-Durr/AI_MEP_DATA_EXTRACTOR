// frontend/src/components/ElectricalSurvey.js - Electrical Panel Survey System
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReportGenerator from "./ReportGenerator";
import ImageDropZone from "./ImageDropZone";

const ElectricalSurvey = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  console.log('[ElectricalSurvey] Component rendered, projectId:', projectId);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [captureMethod, setCaptureMethod] = useState("upload");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(true);

  // Equipment type selector
  const [equipmentType, setEquipmentType] = useState("panel"); // 'panel' or 'transformer'

  // User input state - BEFORE photo capture
  const [userInputs, setUserInputs] = useState({
    panelDesignation: "",
    panelLocation: "",
    condition: "Good"
  });

  // Project and panel/transformer state
  const [project, setProject] = useState(null);
  const [projectPanels, setProjectPanels] = useState([]);
  const [projectTransformers, setProjectTransformers] = useState([]);
  const [currentPanelNumber, setCurrentPanelNumber] = useState(1);
  const [currentTransformerNumber, setCurrentTransformerNumber] = useState(1);

  // Load project function wrapped in useCallback
  const loadProject = useCallback(() => {
    console.log('[ElectricalSurvey] loadProject called, projectId:', projectId);
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      console.log('[ElectricalSurvey] All projects:', projects);
      const foundProject = projects.find((p) => p.id === projectId);
      console.log('[ElectricalSurvey] Found project:', foundProject);
      if (foundProject) {
        setProject(foundProject);
        const panels = foundProject.electricalPanels || [];
        const transformers = foundProject.transformers || [];
        setProjectPanels(panels);
        setProjectTransformers(transformers);
        setCurrentPanelNumber(panels.length + 1);
        setCurrentTransformerNumber(transformers.length + 1);
      } else {
        console.warn('[ElectricalSurvey] Project not found with id:', projectId);
      }
    } else {
      console.warn('[ElectricalSurvey] No saved projects in localStorage');
    }
  }, [projectId]);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  const savePanelToProject = (panelData) => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex !== -1) {
        const panel = {
          id: `panel-${Date.now()}`,
          number: currentPanelNumber,
          data: {
            ...panelData,
            // Include user inputs with the AI data
            panelDesignation: userInputs.panelDesignation,
            panelLocation: userInputs.panelLocation,
            condition: userInputs.condition,
          },
          // DO NOT store image to avoid quota error
          capturedAt: new Date().toISOString(),
        };

        if (!projects[projectIndex].electricalPanels) {
          projects[projectIndex].electricalPanels = [];
        }

        projects[projectIndex].electricalPanels.push(panel);
        projects[projectIndex].lastModified = new Date().toISOString();

        localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

        setProjectPanels(projects[projectIndex].electricalPanels);
        return true;
      }
    }
    return false;
  };

  const saveTransformerToProject = (transformerData) => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex !== -1) {
        const transformer = {
          id: `transformer-${Date.now()}`,
          number: currentTransformerNumber,
          data: {
            ...transformerData,
            // Include user inputs with the AI data
            transformerDesignation: userInputs.panelDesignation, // Using panelDesignation field for now
            transformerLocation: userInputs.panelLocation, // Using panelLocation field for now
            condition: userInputs.condition,
          },
          // DO NOT store image to avoid quota error
          capturedAt: new Date().toISOString(),
        };

        if (!projects[projectIndex].transformers) {
          projects[projectIndex].transformers = [];
        }

        projects[projectIndex].transformers.push(transformer);
        projects[projectIndex].lastModified = new Date().toISOString();

        localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

        setProjectTransformers(projects[projectIndex].transformers);
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

      setCapturedImages(prev => [...prev, imageData]);
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
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setCapturedImages(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleImagesAdded = (newImages) => {
    setCapturedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setCapturedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const moveImageToFirst = (indexToMove) => {
    if (indexToMove === 0) return; // Already first
    setCapturedImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(indexToMove, 1);
      newImages.unshift(movedImage);
      return newImages;
    });
  };

  const uploadAndAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const apiUrl =
        process.env.REACT_APP_API_URL ||
        "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";

      // Send correct equipment type to Lambda: 'electrical' for panels, 'transformer' for transformers
      const lambdaEquipmentType = equipmentType === "transformer" ? "transformer" : "electrical";

      // If multiple images, analyze each and combine results
      // For now, we'll send all images and use the first for primary analysis
      const allBase64Images = capturedImages.map(img => img.split(",")[1]);

      // Send the first image as the primary image
      // In future, Lambda could accept multiple images
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: allBase64Images[0],
          equipmentType: lambdaEquipmentType,
          // Include count of additional images for reference
          additionalImagesCount: allBase64Images.length - 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.success) {
        setExtractedData(responseData.data);
        setShowUploadZone(false); // Hide upload zone after successful analysis
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
    // Save based on equipment type
    const saveSuccess = equipmentType === "transformer"
      ? saveTransformerToProject(extractedData)
      : savePanelToProject(extractedData);

    if (saveSuccess) {
      // Reset for next capture
      setCapturedImages([]);
      setExtractedData(null);
      setError(null);
      setShowUploadZone(true);
      // Reload project to get updated counts
      loadProject();
      // Reset user inputs to defaults
      setUserInputs({
        panelDesignation: "",
        panelLocation: "",
        condition: "Good"
      });
    }
  };

  const completeAndGenerateReport = () => {
    if (extractedData) {
      // Save based on equipment type
      if (equipmentType === "transformer") {
        saveTransformerToProject(extractedData);
      } else {
        savePanelToProject(extractedData);
      }
    }
    navigate(`/?report=${projectId}`);
  };

  console.log('[ElectricalSurvey] Render check - projectId:', projectId, 'project:', project);

  if (!projectId) {
    console.log('[ElectricalSurvey] No projectId, showing error message');
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
            background: "#28a745",
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
                Project #{project.projectNumber} • Capturing{" "}
                {equipmentType === "transformer"
                  ? `Transformer #${currentTransformerNumber}`
                  : `Panel #${currentPanelNumber}`}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                {projectPanels.length} Panel{projectPanels.length !== 1 ? "s" : ""}
                {projectTransformers.length > 0 && (
                  <span> • {projectTransformers.length} Transformer{projectTransformers.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                Electrical Equipment Captured
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout: Camera/Input on left, Live Survey on right */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Left Column - Camera and Input */}
        <div style={{ flex: projectPanels.length > 0 || extractedData ? "0 0 50%" : "1" }}>
          {error && (
            <div
              className="alert"
              style={{ backgroundColor: "#f8d7da", marginBottom: "20px" }}
            >
              <strong>Error: </strong>
              {error}
            </div>
          )}

          {!extractedData && showUploadZone ? (
            <div>
              {/* Equipment Type Selector */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>
                  Select Equipment Type:
                </h3>
                <div style={{ display: "flex", gap: "15px" }}>
                  <label
                    style={{
                      flex: 1,
                      padding: "15px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor: equipmentType === "panel" ? "#28a745" : "#ddd",
                      backgroundColor: equipmentType === "panel" ? "#d4edda" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="radio"
                      value="panel"
                      checked={equipmentType === "panel"}
                      onChange={(e) => {
                        setEquipmentType(e.target.value);
                        // Reset user inputs when switching type
                        setUserInputs({
                          panelDesignation: "",
                          panelLocation: "",
                          condition: "Good"
                        });
                      }}
                      style={{ marginRight: "10px" }}
                    />
                    Panel
                  </label>
                  <label
                    style={{
                      flex: 1,
                      padding: "15px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor: equipmentType === "transformer" ? "#28a745" : "#ddd",
                      backgroundColor: equipmentType === "transformer" ? "#d4edda" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="radio"
                      value="transformer"
                      checked={equipmentType === "transformer"}
                      onChange={(e) => {
                        setEquipmentType(e.target.value);
                        // Reset user inputs when switching type
                        setUserInputs({
                          panelDesignation: "",
                          panelLocation: "",
                          condition: "Good"
                        });
                      }}
                      style={{ marginRight: "10px" }}
                    />
                    Transformer
                  </label>
                </div>
              </div>

              {/* User Input Form - BEFORE photo capture */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>
                  {equipmentType === "transformer"
                    ? `Transformer #${currentTransformerNumber} Information:`
                    : `Panel #${currentPanelNumber} Information:`}
                </h3>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    {equipmentType === "transformer"
                      ? "Transformer Designation:"
                      : "Panel Designation:"}
                  </label>
                  <input
                    type="text"
                    value={userInputs.panelDesignation}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        panelDesignation: e.target.value,
                      })
                    }
                    placeholder={
                      equipmentType === "transformer"
                        ? "e.g., Transformer T1, T-1, Main Transformer, etc."
                        : "e.g., Panelboard 1, Panel A, MDP, etc."
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "16px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    {equipmentType === "transformer"
                      ? "Transformer Location:"
                      : "Panel Location:"}
                  </label>
                  <input
                    type="text"
                    value={userInputs.panelLocation}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        panelLocation: e.target.value,
                      })
                    }
                    placeholder="e.g., Electrical Room, Kitchen, Mall Mechanical Room, etc."
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "16px",
                    }}
                  />
                </div>

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
                    {/* Only show Hazardous option for panels, not transformers */}
                    {equipmentType !== "transformer" && (
                      <option value="Hazardous">Hazardous</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Drag and Drop / Upload Section */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>
                  Upload{" "}
                  {equipmentType === "transformer"
                    ? `Transformer #${currentTransformerNumber}`
                    : `Panel #${currentPanelNumber}`}{" "}
                  Photos:
                </h3>

                {/* Tab buttons for Camera vs Upload */}
                <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                  <button
                    onClick={() => setCaptureMethod("upload")}
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
                    📁 Drag & Drop / Browse
                  </button>
                  <button
                    onClick={() => setCaptureMethod("camera")}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "15px",
                      backgroundColor:
                        captureMethod === "camera" ? "#17a2b8" : "white",
                      color: captureMethod === "camera" ? "white" : "#333",
                      border: "2px solid #17a2b8",
                    }}
                  >
                    📱 Use Camera
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                {captureMethod === "upload" && (
                  <div>
                    <ImageDropZone
                      onImagesAdded={handleImagesAdded}
                      existingImages={capturedImages}
                    />
                    {capturedImages.length > 0 && (
                      <button
                        onClick={() => setShowUploadZone(false)}
                        className="btn btn-success"
                        style={{
                          width: "100%",
                          padding: "15px",
                          marginTop: "15px",
                        }}
                      >
                        ✓ Done - Continue with {capturedImages.length} Photo{capturedImages.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}

                {captureMethod === "camera" && !cameraStarted && (
                  <button
                    onClick={startCamera}
                    disabled={!userInputs.panelDesignation || !userInputs.panelLocation}
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "15px",
                      marginTop: "15px",
                      opacity: !userInputs.panelDesignation || !userInputs.panelLocation ? 0.6 : 1,
                    }}
                  >
                    📷 Open Camera
                  </button>
                )}

                {(!userInputs.panelDesignation || !userInputs.panelLocation) && (
                  <p style={{ marginTop: "10px", color: "#dc3545", fontSize: "14px" }}>
                    Please fill in{" "}
                    {equipmentType === "transformer" ? "transformer" : "panel"}{" "}
                    designation and location before capturing
                  </p>
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
                        {equipmentType === "transformer"
                          ? `Transformer #${currentTransformerNumber}`
                          : `Panel #${currentPanelNumber}`}
                      </h3>
                      <p style={{ margin: 0 }}>
                        Point camera at{" "}
                        {equipmentType === "transformer" ? "transformer" : "panel"}{" "}
                        nameplate
                      </p>
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
          ) : capturedImages.length > 0 && !extractedData && !showUploadZone ? (
            <div>
              {/* Image Gallery */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>
                  {capturedImages.length} Photo{capturedImages.length !== 1 ? 's' : ''} Ready for Analysis
                </h3>

                <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "8px" }}>
                  <p style={{ margin: "0", fontSize: "14px", color: "#0066cc" }}>
                    💡 <strong>Tip:</strong> Click on any photo to make it PRIMARY (used for AI analysis). This is useful if your nameplate photo doesn't show all details.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
                  {capturedImages.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => moveImageToFirst(index)}
                      style={{
                        position: "relative",
                        paddingBottom: "100%",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: index === 0 ? "3px solid #28a745" : "2px solid #ddd",
                        cursor: index === 0 ? "default" : "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (index !== 0) {
                          e.currentTarget.style.border = "3px solid #007bff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== 0) {
                          e.currentTarget.style.border = "2px solid #ddd";
                        }
                      }}
                    >
                      <img
                        src={image}
                        alt={`Panel ${index + 1}`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "5px",
                          left: "5px",
                          backgroundColor: index === 0 ? "#28a745" : "rgba(0,0,0,0.7)",
                          color: "white",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {index === 0 ? "PRIMARY ✓" : `#${index + 1} - Click to Analyze`}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        style={{
                          position: "absolute",
                          top: "5px",
                          right: "5px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          cursor: "pointer",
                          fontSize: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 10,
                        }}
                      >
                        ×
                      </button>
                      {index !== 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "5px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "rgba(0,123,255,0.9)",
                            color: "white",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            opacity: 0,
                            transition: "opacity 0.2s",
                          }}
                          className="click-to-select-hint"
                        >
                          Click to make PRIMARY
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <style>{`
                  .click-to-select-hint:hover {
                    opacity: 1 !important;
                  }
                `}</style>

                {/* Add More Photos Button - Opens Drag & Drop */}
                <button
                  onClick={() => {
                    setShowUploadZone(true);
                    setCaptureMethod("upload");
                  }}
                  className="btn"
                  style={{
                    width: "100%",
                    padding: "15px",
                    backgroundColor: "#17a2b8",
                    color: "white",
                    fontSize: "16px",
                  }}
                >
                  📁 Add More Photos (Drag & Drop)
                </button>
              </div>

              {/* Show user inputs summary and Analyze button */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>
                  {equipmentType === "transformer"
                    ? "Transformer Information Summary:"
                    : "Panel Information Summary:"}
                </h3>
                <p>
                  <strong>
                    {equipmentType === "transformer"
                      ? "Transformer Designation:"
                      : "Panel Designation:"}
                  </strong>{" "}
                  {userInputs.panelDesignation}
                </p>
                <p>
                  <strong>Location:</strong> {userInputs.panelLocation}
                </p>
                <p>
                  <strong>Condition:</strong> {userInputs.condition}
                </p>
                <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
                  <strong>Note:</strong> {capturedImages.length > 1
                    ? `All ${capturedImages.length} photos will be included. The PRIMARY photo will be used for AI analysis.`
                    : "The photo will be used for AI analysis."}
                </p>

                <div
                  style={{ display: "flex", gap: "15px", marginTop: "20px" }}
                >
                  <button
                    onClick={() => {
                      setCapturedImages([]);
                      setError(null);
                      setShowUploadZone(true);
                    }}
                    className="btn"
                    style={{
                      backgroundColor: "#6c757d",
                      color: "white",
                      padding: "12px 24px",
                    }}
                  >
                    🔄 Clear All Photos
                  </button>
                  <button
                    onClick={uploadAndAnalyze}
                    disabled={analyzing || capturedImages.length === 0}
                    className="btn btn-success"
                    style={{
                      flex: 1,
                      padding: "12px 24px",
                      opacity: analyzing || capturedImages.length === 0 ? 0.6 : 1,
                    }}
                  >
                    {analyzing ? "Analyzing..." : "🤖 Analyze Nameplate"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {extractedData && (
                <div>
                  {/* Safety Warning - ONLY FOR PANELS (not transformers) */}
                  {equipmentType !== "transformer" &&
                   extractedData.safetyWarnings &&
                   (extractedData.safetyWarnings.isFPE ||
                    extractedData.safetyWarnings.isZinsco ||
                    extractedData.safetyWarnings.isChallenger) && (
                    <div
                      className="card"
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        marginBottom: "20px",
                        border: "3px solid #721c24",
                      }}
                    >
                      <h2 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
                        ⚠️ SAFETY HAZARD DETECTED ⚠️
                      </h2>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                        {extractedData.safetyWarnings.warnings.map((warning, index) => (
                          <p key={index} style={{ margin: "10px 0" }}>
                            {warning}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className="card"
                    style={{ backgroundColor: "#d4edda", marginBottom: "20px" }}
                  >
                    <h3 style={{ margin: "0 0 15px 0" }}>
                      ✅{" "}
                      {equipmentType === "transformer"
                        ? `Transformer #${currentTransformerNumber}`
                        : `Panel #${currentPanelNumber}`}{" "}
                      Analysis Complete
                    </h3>
                    <div className="card" style={{ backgroundColor: "white" }}>
                      <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
                        {equipmentType === "transformer"
                          ? "Transformer Information:"
                          : "Panel Information:"}
                      </h4>
                      <p>
                        <strong>
                          {equipmentType === "transformer"
                            ? "Transformer Designation:"
                            : "Panel Designation:"}
                        </strong>{" "}
                        {userInputs.panelDesignation}
                      </p>
                      <p>
                        <strong>Location:</strong> {userInputs.panelLocation}
                      </p>
                      <p>
                        <strong>Condition:</strong> {userInputs.condition}
                      </p>

                      <hr style={{ margin: "20px 0" }} />

                      <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
                        AI Extracted Data:
                      </h4>

                      {/* Conditional display based on equipment type */}
                      {equipmentType === "transformer" ? (
                        /* TRANSFORMER FIELDS */
                        <>
                          {/* Basic Info Section */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Basic Information:
                            </h5>
                            <p>
                              <strong>Manufacturer:</strong>{" "}
                              {extractedData.basicInfo?.manufacturer || "Not Available"}
                            </p>
                            <p>
                              <strong>Model:</strong>{" "}
                              {extractedData.basicInfo?.model || "Not Available"}
                            </p>
                            <p>
                              <strong>Serial Number:</strong>{" "}
                              {extractedData.basicInfo?.serialNumber || "Not Available"}
                            </p>
                            <p>
                              <strong>Phase:</strong>{" "}
                              {extractedData.basicInfo?.phase || "Not Available"}
                            </p>
                            <p>
                              <strong>Transformer Type:</strong>{" "}
                              {extractedData.systemType?.transformerType || "Not Available"}
                            </p>
                          </div>

                          {/* Electrical Specifications */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Electrical Specifications:
                            </h5>
                            <p>
                              <strong>Power Rating (kVA):</strong>{" "}
                              {extractedData.electrical?.powerRating || "Not Available"}
                            </p>
                            <p>
                              <strong>Primary Voltage:</strong>{" "}
                              {extractedData.electrical?.primaryVoltage || "Not Available"}
                            </p>
                            <p>
                              <strong>Secondary Voltage:</strong>{" "}
                              {extractedData.electrical?.secondaryVoltage || "Not Available"}
                            </p>
                            <p>
                              <strong>Impedance:</strong>{" "}
                              {extractedData.electrical?.impedance || "Not Available"}
                            </p>
                            <p>
                              <strong>Insulation Rating:</strong>{" "}
                              {extractedData.electrical?.insulationRating || "Not Available"}
                            </p>
                            <p>
                              <strong>Temperature Rise:</strong>{" "}
                              {extractedData.electrical?.temperatureRise || "Not Available"}
                            </p>
                          </div>

                          {/* Physical/Mounting */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Physical:
                            </h5>
                            <p>
                              <strong>Mounting Type:</strong>{" "}
                              {extractedData.mounting?.type || "Not Available"}
                            </p>
                            <p style={{ fontSize: "14px", color: "#666", fontStyle: "italic" }}>
                              {extractedData.physicalDimensions?.note ||
                               "Physical dimensions require field measurement"}
                            </p>
                          </div>
                        </>
                      ) : (
                        /* PANEL FIELDS */
                        <>
                          {/* Basic Info Section */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Basic Information:
                            </h5>
                            <p>
                              <strong>Manufacturer:</strong>{" "}
                              {extractedData.basicInfo?.manufacturer || "Not Available"}
                            </p>
                            <p>
                              <strong>Model:</strong>{" "}
                              {extractedData.basicInfo?.model || "Not Available"}
                            </p>
                            <p>
                              <strong>Serial Number:</strong>{" "}
                              {extractedData.basicInfo?.serialNumber || "Not Available"}
                            </p>
                            <p>
                              <strong>Pole Spaces:</strong>{" "}
                              {extractedData.basicInfo?.poleSpaces || "Not Available"}
                            </p>
                            <p>
                              <strong>Panel Type:</strong>{" "}
                              {extractedData.systemType?.panelType || "Not Available"}
                            </p>
                          </div>

                          {/* Electrical Info */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Electrical Specifications:
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
                              <strong>Wire Configuration:</strong>{" "}
                              {extractedData.electrical?.wireConfig || "Not Available"}
                            </p>
                            <p>
                              <strong>Bus Rating:</strong>{" "}
                              {extractedData.electrical?.busRating || "Not Available"}
                            </p>
                            <p>
                              <strong>Available Fault Current:</strong>{" "}
                              {extractedData.electrical?.availableFaultCurrent || "Not Available"}
                            </p>
                          </div>

                          {/* Incoming Termination */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Incoming Termination:
                            </h5>
                            <p>
                              <strong>Type:</strong>{" "}
                              {extractedData.incomingTermination?.type || "Not Available"}
                            </p>
                            <p>
                              <strong>Main Breaker Size:</strong>{" "}
                              {extractedData.incomingTermination?.mainBreakerSize || "Not Available"}
                            </p>
                            <p>
                              <strong>Main Breaker Poles:</strong>{" "}
                              {extractedData.incomingTermination?.mainBreakerPoles || "Not Available"}
                            </p>
                          </div>

                          {/* Mounting */}
                          <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ color: "#666", margin: "10px 0" }}>
                              Physical:
                            </h5>
                            <p>
                              <strong>Mounting Type:</strong>{" "}
                              {extractedData.mounting?.type || "Not Available"}
                            </p>
                            <p style={{ fontSize: "14px", color: "#666", fontStyle: "italic" }}>
                              {extractedData.physicalDimensions?.note ||
                               "Physical dimensions require field measurement"}
                            </p>
                          </div>
                        </>
                      )}

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
                      ✅ Save & Add{" "}
                      {equipmentType === "transformer"
                        ? `Transformer #${currentTransformerNumber + 1}`
                        : `Panel #${currentPanelNumber + 1}`}
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
        {(projectPanels.length > 0 || projectTransformers.length > 0 || extractedData) && (
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
              currentPanelNumber={currentPanelNumber}
              currentTransformerNumber={currentTransformerNumber}
              currentUserInputs={userInputs}
              equipmentType="electrical"
              currentEquipmentSubtype={equipmentType} // 'panel' or 'transformer'
            />
          </div>
        )}
        {/* End Right Column */}
      </div>
    </div>
  );
};

export default ElectricalSurvey;
