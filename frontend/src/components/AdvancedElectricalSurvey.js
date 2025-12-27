// frontend/src/components/AdvancedElectricalSurvey.js
// Advanced AI-first electrical surveying with automatic equipment classification

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ImageDropZone from "./ImageDropZone";
import PostExtractionInputForm from "./PostExtractionInputForm";
import GapDetectionPanel from "./GapDetectionPanel";
import { validateElectricalHierarchy } from "../utils/electricalValidation";

const AdvancedElectricalSurvey = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Workflow stages
  const STAGES = {
    IMAGE_UPLOAD: "IMAGE_UPLOAD",
    CLASSIFICATION: "CLASSIFICATION",
    AI_ANALYSIS: "AI_ANALYSIS",
    USER_INPUTS: "USER_INPUTS",
    REVIEW: "REVIEW",
    SAVE: "SAVE",
  };

  // State management
  const [stage, setStage] = useState(STAGES.IMAGE_UPLOAD);
  const [project, setProject] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractedEquipment, setExtractedEquipment] = useState([]);
  const [userInputsByEquipment, setUserInputsByEquipment] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [preparedEquipment, setPreparedEquipment] = useState([]);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // Load project on mount
  const loadProject = useCallback(() => {
    try {
      const projects = JSON.parse(
        localStorage.getItem("mep-survey-projects") || "[]"
      );
      const foundProject = projects.find((p) => p.id === projectId);

      if (!foundProject) {
        setError("Project not found");
        return;
      }

      setProject(foundProject);
    } catch (err) {
      console.error("Error loading project:", err);
      setError("Failed to load project");
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // ========== STAGE 1: IMAGE UPLOAD ==========

  const handleImageUpload = (images) => {
    console.log(`Received ${images.length} images for upload`);
    setUploadedImages(images);
    setError(null);
  };

  const handleRemoveImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceedToClassification = () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least one image");
      return;
    }

    setStage(STAGES.CLASSIFICATION);
    classifyImages();
  };

  // ========== STAGE 2: CLASSIFICATION ==========

  const classifyImages = async () => {
    setProcessing(true);
    setProgressMessage("Classifying equipment in images...");
    setError(null);

    try {
      const apiUrl = localStorage.getItem("mep-api-url");
      if (!apiUrl) {
        throw new Error("API URL not configured");
      }

      const classified = [];

      for (let i = 0; i < uploadedImages.length; i++) {
        setProgressMessage(
          `Classifying image ${i + 1} of ${uploadedImages.length}...`
        );

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: uploadedImages[i],
            images: [uploadedImages[i]],
            equipmentType: "classification", // Use classification prompt
          }),
        });

        if (!response.ok) {
          throw new Error(`Classification failed for image ${i + 1}`);
        }

        const result = await response.json();
        console.log(`Classification result ${i + 1}:`, result);

        if (!result.success || !result.data) {
          throw new Error(`Invalid classification response for image ${i + 1}`);
        }

        classified.push({
          imageIndex: i,
          imageData: uploadedImages[i],
          classification: result.data,
        });
      }

      setProcessing(false);
      setProgressMessage("");

      // Automatically proceed to AI analysis
      setStage(STAGES.AI_ANALYSIS);
      extractDataFromClassified(classified);
    } catch (err) {
      console.error("Classification error:", err);
      setError(err.message || "Failed to classify images");
      setProcessing(false);
      setProgressMessage("");
    }
  };

  // ========== STAGE 3: AI ANALYSIS ==========

  const extractDataFromClassified = async (classified) => {
    setProcessing(true);
    setProgressMessage("Extracting data from equipment...");
    setError(null);

    try {
      const apiUrl = localStorage.getItem("mep-api-url");
      const extracted = [];

      for (let i = 0; i < classified.length; i++) {
        const item = classified[i];
        const equipmentType = item.classification.equipmentType;

        setProgressMessage(
          `Analyzing ${equipmentType} (${i + 1} of ${classified.length})...`
        );

        // Skip images classified as UNKNOWN
        if (equipmentType === "UNKNOWN") {
          console.log(
            `Skipping image ${i + 1}: classified as UNKNOWN`
          );
          extracted.push({
            imageIndex: item.imageIndex,
            imageData: item.imageData,
            classification: item.classification,
            extractedData: null,
            skipped: true,
            skipReason: "Equipment type could not be identified",
          });
          continue;
        }

        // Skip if extraction feasibility is NONE
        if (item.classification.extractionFeasibility === "NONE") {
          console.log(
            `Skipping image ${i + 1}: extraction not feasible (poor quality)`
          );
          extracted.push({
            imageIndex: item.imageIndex,
            imageData: item.imageData,
            classification: item.classification,
            extractedData: null,
            skipped: true,
            skipReason: "Image quality too poor for data extraction",
          });
          continue;
        }

        // Map classification type to equipment type for extraction
        const extractionType = mapClassificationToExtractionType(equipmentType);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: item.imageData,
            images: [item.imageData],
            equipmentType: extractionType,
          }),
        });

        if (!response.ok) {
          throw new Error(`Data extraction failed for image ${i + 1}`);
        }

        const result = await response.json();
        console.log(`Extraction result ${i + 1}:`, result);

        if (!result.success || !result.data) {
          throw new Error(`Invalid extraction response for image ${i + 1}`);
        }

        extracted.push({
          imageIndex: item.imageIndex,
          imageData: item.imageData,
          classification: item.classification,
          extractedData: result.data,
          skipped: false,
        });
      }

      setExtractedEquipment(extracted);
      setProcessing(false);
      setProgressMessage("");

      console.log("Extraction complete:", extracted);
    } catch (err) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to extract data from images");
      setProcessing(false);
      setProgressMessage("");
    }
  };

  // Map classification equipment type to extraction equipment type
  const mapClassificationToExtractionType = (classificationType) => {
    const mapping = {
      TRANSFORMER: "transformer",
      SERVICE_DISCONNECT: "service_disconnect",
      METER_ENCLOSURE: "meter",
      PANEL_NAMEPLATE: "electrical",
      PANEL_INTERIOR: "electrical",
      UNKNOWN: null,
    };

    return mapping[classificationType] || "electrical";
  };

  // ========== STAGE 4: USER INPUTS ==========

  const [currentEquipmentIndex, setCurrentEquipmentIndex] = useState(0);

  const handleProceedToUserInputs = () => {
    // Filter out skipped equipment
    const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);

    if (validEquipment.length === 0) {
      setError("No valid equipment found. All images were skipped.");
      return;
    }

    setCurrentEquipmentIndex(0);
    setStage(STAGES.USER_INPUTS);
  };

  const handleUserInputSave = (inputs) => {
    const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);
    const currentEquipment = validEquipment[currentEquipmentIndex];

    // Save user inputs for this equipment
    setUserInputsByEquipment((prev) => ({
      ...prev,
      [currentEquipment.imageIndex]: inputs,
    }));

    // Move to next equipment or proceed to review
    if (currentEquipmentIndex < validEquipment.length - 1) {
      setCurrentEquipmentIndex(currentEquipmentIndex + 1);
    } else {
      // All equipment has user inputs, proceed to review
      setStage(STAGES.REVIEW);
      performValidation();
    }
  };

  const handleUserInputCancel = () => {
    if (currentEquipmentIndex > 0) {
      setCurrentEquipmentIndex(currentEquipmentIndex - 1);
    } else {
      setStage(STAGES.AI_ANALYSIS);
    }
  };

  // ========== STAGE 5: REVIEW ==========

  const performValidation = () => {
    // Build equipment array with all data for validation
    const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);

    const equipmentForValidation = validEquipment.map((eq, index) => {
      const userInputs = userInputsByEquipment[eq.imageIndex] || {};

      return {
        id: `temp-${eq.imageIndex}`,
        type: mapClassificationToEquipmentType(
          eq.classification.equipmentType
        ),
        hierarchyLevel: 0, // Will be determined by hierarchy building
        parentId: null,
        equipmentNumber: index + 1,
        aiExtractedData: eq.extractedData,
        userInputs: userInputs,
      };
    });

    // Run validation
    const validationIssues = validateElectricalHierarchy(equipmentForValidation);
    setValidationResults(validationIssues);
    setPreparedEquipment(equipmentForValidation);
  };

  const mapClassificationToEquipmentType = (classificationType) => {
    const mapping = {
      TRANSFORMER: "transformer",
      SERVICE_DISCONNECT: "service_disconnect",
      METER_ENCLOSURE: "meter",
      PANEL_NAMEPLATE: "panel",
      PANEL_INTERIOR: "panel",
    };

    return mapping[classificationType] || "panel";
  };

  const handleBackToUserInputs = () => {
    const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);
    setCurrentEquipmentIndex(validEquipment.length - 1);
    setStage(STAGES.USER_INPUTS);
  };

  const handleProceedToSave = () => {
    // Check for critical errors
    if (validationResults?.errors?.length > 0) {
      setError(
        "Please resolve critical validation errors before saving. Go back to edit equipment details."
      );
      return;
    }

    setStage(STAGES.SAVE);
    saveEquipmentToProject();
  };

  // ========== STAGE 6: SAVE ==========

  const saveEquipmentToProject = () => {
    setProcessing(true);
    setProgressMessage("Saving equipment to project...");

    try {
      const projects = JSON.parse(
        localStorage.getItem("mep-survey-projects") || "[]"
      );
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex === -1) {
        throw new Error("Project not found");
      }

      // Initialize electricalEquipment array if it doesn't exist
      if (!projects[projectIndex].electricalEquipment) {
        projects[projectIndex].electricalEquipment = [];
      }

      const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);

      // Save each equipment piece
      validEquipment.forEach((eq) => {
        const userInputs = userInputsByEquipment[eq.imageIndex] || {};

        const equipmentData = {
          id: `equipment-${Date.now()}-${eq.imageIndex}`,
          type: mapClassificationToEquipmentType(
            eq.classification.equipmentType
          ),
          equipmentNumber:
            projects[projectIndex].electricalEquipment.length + 1,
          hierarchyLevel: 0, // Will be calculated later
          parentId: null,
          childIds: [],

          // AI Extracted Data
          aiExtractedData: {
            ...eq.extractedData,
            classification: eq.classification,
          },

          // User Provided Data
          userInputs: {
            designation: userInputs.designation || "",
            location: userInputs.location || "",
            mounting: userInputs.mounting || {
              type: "",
              aiSuggested: eq.extractedData?.mounting?.type || "",
              userOverride: false,
            },
            wireSize: userInputs.wireSize || {
              phase: "",
              neutral: "",
              ground: "",
            },
            conduitSize: userInputs.conduitSize || "",
            physicalDimensions: userInputs.physicalDimensions || {
              width: "",
              height: "",
              depth: "",
              distanceFromWall: "",
            },
            condition: userInputs.condition || "Good",
            notes: userInputs.notes || "",
          },

          // Images (store only the primary image to save space)
          nameplateImages: [eq.imageData],
          primaryImageIndex: 0,

          // Validation
          validationWarnings: [],
          gapFlags: {
            hasUnreadableFields:
              eq.extractedData?.missingFields?.length > 0 || false,
            missingCriticalData: false,
            conflictingData: false,
            incompleteUserInputs: false,
          },

          capturedAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        projects[projectIndex].electricalEquipment.push(equipmentData);
      });

      // Update project summary
      const equipmentByType = {};
      projects[projectIndex].electricalEquipment.forEach((eq) => {
        equipmentByType[eq.type] = (equipmentByType[eq.type] || 0) + 1;
      });

      projects[projectIndex].electricalSummary = {
        totalEquipment: projects[projectIndex].electricalEquipment.length,
        byType: equipmentByType,
        averageConfidence:
          projects[projectIndex].electricalEquipment.reduce((sum, eq) => {
            return (
              sum + (eq.aiExtractedData?.confidenceScores?.overall || 0.5)
            );
          }, 0) / projects[projectIndex].electricalEquipment.length,
        totalValidationWarnings: validationResults?.warnings?.length || 0,
        hierarchyComplete: false,
      };

      projects[projectIndex].lastModified = new Date().toISOString();

      // Save to localStorage
      localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

      setProcessing(false);
      setProgressMessage("");

      // Navigate back to project page
      setTimeout(() => {
        navigate(`/project/${projectId}`);
      }, 1000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save equipment to project");
      setProcessing(false);
      setProgressMessage("");
    }
  };

  // ========== RENDERING ==========

  const renderUserInputsStage = () => {
    const validEquipment = extractedEquipment.filter((eq) => !eq.skipped);
    const currentEquipment = validEquipment[currentEquipmentIndex];

    if (!currentEquipment) {
      return <div>No equipment to configure</div>;
    }

    return (
      <div>
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e7f3ff",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Equipment {currentEquipmentIndex + 1} of {validEquipment.length}
          </h3>
          <p style={{ margin: 0, color: "#666" }}>
            Provide additional details for this equipment
          </p>
        </div>

        <PostExtractionInputForm
          equipment={currentEquipment}
          onSave={handleUserInputSave}
          onCancel={handleUserInputCancel}
        />
      </div>
    );
  };

  const renderReviewStage = () => {
    return (
      <GapDetectionPanel
        validationResults={validationResults}
        equipment={preparedEquipment}
        onBack={handleBackToUserInputs}
        onSave={handleProceedToSave}
      />
    );
  };

  const renderSaveStage = () => {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        {processing ? (
          <div>
            <div
              style={{
                display: "inline-block",
                width: "60px",
                height: "60px",
                border: "6px solid #f3f3f3",
                borderTop: "6px solid #28a745",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <h2 style={{ marginTop: "30px" }}>{progressMessage}</h2>
            <p style={{ color: "#666" }}>
              Saving equipment data to project...
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "60px",
                marginBottom: "20px",
              }}
            >
              ✅
            </div>
            <h2>Survey Saved Successfully!</h2>
            <p style={{ color: "#666", marginTop: "10px" }}>
              Returning to project page...
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStageIndicator = () => {
    const stages = [
      { key: STAGES.IMAGE_UPLOAD, label: "Upload", number: 1 },
      { key: STAGES.CLASSIFICATION, label: "Classify", number: 2 },
      { key: STAGES.AI_ANALYSIS, label: "Extract", number: 3 },
      { key: STAGES.USER_INPUTS, label: "Details", number: 4 },
      { key: STAGES.REVIEW, label: "Review", number: 5 },
      { key: STAGES.SAVE, label: "Save", number: 6 },
    ];

    const currentIndex = stages.findIndex((s) => s.key === stage);

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        {stages.map((s, index) => (
          <React.Fragment key={s.key}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor:
                    index <= currentIndex ? "#007bff" : "#ddd",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                {index < currentIndex ? "✓" : s.number}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: index <= currentIndex ? "#007bff" : "#999",
                  fontWeight: index === currentIndex ? "bold" : "normal",
                }}
              >
                {s.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div
                style={{
                  width: "50px",
                  height: "2px",
                  backgroundColor: index < currentIndex ? "#007bff" : "#ddd",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderImageUploadStage = () => {
    return (
      <div>
        <h2 style={{ marginBottom: "20px" }}>Upload Equipment Photos</h2>
        <p style={{ marginBottom: "20px", color: "#666" }}>
          Upload photos of electrical equipment. The AI will automatically
          identify and classify each piece of equipment (transformers, service
          disconnects, meters, panels).
        </p>

        {uploadedImages.length === 0 ? (
          <ImageDropZone onImagesSelected={handleImageUpload} />
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              {uploadedImages.map((img, index) => (
                <div
                  key={index}
                  style={{
                    position: "relative",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    style={{ width: "100%", height: "150px", objectFit: "cover" }}
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      backgroundColor: "rgba(255, 0, 0, 0.8)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "30px",
                      height: "30px",
                      cursor: "pointer",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                  <div
                    style={{
                      padding: "5px",
                      backgroundColor: "#f5f5f5",
                      fontSize: "12px",
                      textAlign: "center",
                    }}
                  >
                    Image {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <ImageDropZone
                onImagesSelected={(newImages) =>
                  setUploadedImages([...uploadedImages, ...newImages])
                }
                buttonText="Add More Images"
              />
              <button
                onClick={handleProceedToClassification}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Proceed to Classification ({uploadedImages.length} image
                {uploadedImages.length !== 1 ? "s" : ""})
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClassificationStage = () => {
    return (
      <div>
        <h2 style={{ marginBottom: "20px" }}>Equipment Classification</h2>
        <p style={{ marginBottom: "20px", color: "#666" }}>
          AI is analyzing each image to identify equipment type...
        </p>

        {processing && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                display: "inline-block",
                width: "50px",
                height: "50px",
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: "20px", fontSize: "16px" }}>
              {progressMessage}
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  };

  const renderAIAnalysisStage = () => {
    const getEquipmentTypeLabel = (type) => {
      const labels = {
        TRANSFORMER: "Transformer",
        SERVICE_DISCONNECT: "Service Disconnect",
        METER_ENCLOSURE: "Meter Enclosure",
        PANEL_NAMEPLATE: "Panel Nameplate",
        PANEL_INTERIOR: "Panel Interior",
        UNKNOWN: "Unknown Equipment",
      };
      return labels[type] || type;
    };

    const getConfidenceBadge = (confidence) => {
      const colors = {
        high: "#28a745",
        medium: "#ffc107",
        low: "#dc3545",
      };

      return (
        <span
          style={{
            padding: "3px 8px",
            backgroundColor: colors[confidence] || "#999",
            color: "white",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "bold",
            marginLeft: "10px",
          }}
        >
          {confidence?.toUpperCase() || "UNKNOWN"}
        </span>
      );
    };

    return (
      <div>
        <h2 style={{ marginBottom: "20px" }}>AI Analysis Results</h2>
        <p style={{ marginBottom: "20px", color: "#666" }}>
          Review the extracted data from each piece of equipment. In the next
          step, you'll provide additional details that AI cannot determine from
          photos.
        </p>

        {processing ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                display: "inline-block",
                width: "50px",
                height: "50px",
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: "20px", fontSize: "16px" }}>
              {progressMessage}
            </p>
          </div>
        ) : (
          <div>
            {extractedEquipment.map((item, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "20px",
                  backgroundColor: item.skipped ? "#fff3cd" : "white",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  {/* Image Preview */}
                  <div style={{ flexShrink: 0 }}>
                    <img
                      src={item.imageData}
                      alt={`Equipment ${index + 1}`}
                      style={{
                        width: "200px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>

                  {/* Equipment Details */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: "10px" }}>
                      {getEquipmentTypeLabel(
                        item.classification.equipmentType
                      )}
                      {getConfidenceBadge(item.classification.confidence)}
                    </h3>

                    {item.skipped ? (
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: "4px",
                        }}
                      >
                        <strong>⚠️ Skipped:</strong> {item.skipReason}
                      </div>
                    ) : (
                      <div>
                        {/* Classification Details */}
                        <div
                          style={{
                            marginBottom: "15px",
                            padding: "10px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "4px",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px",
                              fontSize: "14px",
                            }}
                          >
                            <div>
                              <strong>Image Quality:</strong>{" "}
                              {item.classification.imageQuality}
                            </div>
                            <div>
                              <strong>Extraction Feasibility:</strong>{" "}
                              {item.classification.extractionFeasibility}
                            </div>
                          </div>
                          {item.classification.issues &&
                            item.classification.issues.length > 0 && (
                              <div style={{ marginTop: "10px" }}>
                                <strong>Issues:</strong>{" "}
                                {item.classification.issues.join(", ")}
                              </div>
                            )}
                        </div>

                        {/* Extracted Data */}
                        {item.extractedData && (
                          <div>
                            <h4 style={{ marginBottom: "10px" }}>
                              Extracted Information:
                            </h4>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "10px",
                                fontSize: "14px",
                              }}
                            >
                              {item.extractedData.basicInfo && (
                                <>
                                  <div>
                                    <strong>Manufacturer:</strong>{" "}
                                    {item.extractedData.basicInfo
                                      .manufacturer || "N/A"}
                                  </div>
                                  <div>
                                    <strong>Model:</strong>{" "}
                                    {item.extractedData.basicInfo.model ||
                                      "N/A"}
                                  </div>
                                  {item.extractedData.basicInfo
                                    .serialNumber && (
                                    <div>
                                      <strong>Serial Number:</strong>{" "}
                                      {item.extractedData.basicInfo
                                        .serialNumber}
                                    </div>
                                  )}
                                </>
                              )}
                              {item.extractedData.electrical && (
                                <>
                                  <div>
                                    <strong>Voltage:</strong>{" "}
                                    {item.extractedData.electrical.voltage ||
                                      "N/A"}
                                  </div>
                                  <div>
                                    <strong>Amperage:</strong>{" "}
                                    {item.extractedData.electrical.busRating ||
                                      item.extractedData.electrical
                                        .ampRating ||
                                      item.extractedData.electrical
                                        .powerRating ||
                                      "N/A"}
                                  </div>
                                  {item.extractedData.electrical.phase && (
                                    <div>
                                      <strong>Phase:</strong>{" "}
                                      {item.extractedData.electrical.phase}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Confidence Scores */}
                            {item.extractedData.confidenceScores && (
                              <div
                                style={{
                                  marginTop: "15px",
                                  padding: "10px",
                                  backgroundColor: "#e7f3ff",
                                  borderRadius: "4px",
                                }}
                              >
                                <strong>Overall Confidence:</strong>{" "}
                                {(
                                  item.extractedData.confidenceScores
                                    .overall * 100
                                ).toFixed(0)}
                                %
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "30px",
              }}
            >
              <button
                onClick={() => setStage(STAGES.IMAGE_UPLOAD)}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ← Back to Upload
              </button>
              <button
                onClick={handleProceedToUserInputs}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Proceed to Details →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "2px solid #ddd",
        }}
      >
        <h1>Advanced Electrical Survey</h1>
        <p style={{ color: "#666", marginTop: "10px" }}>
          {project?.name || "Loading..."}
        </p>
      </div>

      {/* Stage Progress Indicator */}
      {renderStageIndicator()}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stage Content */}
      {stage === STAGES.IMAGE_UPLOAD && renderImageUploadStage()}
      {stage === STAGES.CLASSIFICATION && renderClassificationStage()}
      {stage === STAGES.AI_ANALYSIS && renderAIAnalysisStage()}
      {stage === STAGES.USER_INPUTS && renderUserInputsStage()}
      {stage === STAGES.REVIEW && renderReviewStage()}
      {stage === STAGES.SAVE && renderSaveStage()}

      {/* Cancel Button */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <button
          onClick={() =>
            navigate(`/project/${projectId}`)
          }
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cancel Survey
        </button>
      </div>
    </div>
  );
};

export default AdvancedElectricalSurvey;
