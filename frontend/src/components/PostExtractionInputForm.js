// frontend/src/components/PostExtractionInputForm.js
// Post-extraction user input form - collects data AI cannot determine from photos

import React, { useState } from "react";
import {
  wireSizeOptions,
  conduitSizeOptions,
  validateWireSize,
  validateConduitFill,
  parseAmperage,
} from "../utils/electricalValidation";

const PostExtractionInputForm = ({ equipment, onSave, onCancel }) => {
  const [userInputs, setUserInputs] = useState({
    designation: "",
    location: "",
    mounting: {
      type: equipment?.extractedData?.mounting?.type || "",
      aiSuggested: equipment?.extractedData?.mounting?.type || "",
      userOverride: false,
    },
    wireSize: {
      phase: "",
      neutral: "",
      ground: "",
    },
    conduitSize: "",
    physicalDimensions: {
      width: "",
      height: "",
      depth: "",
      distanceFromWall: "",
    },
    condition: "Good",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Location options
  const locationOptions = [
    "Electrical Room",
    "Mechanical Room",
    "Kitchen",
    "Basement",
    "Exterior - Building",
    "Roof",
    "Utility Closet",
    "Hallway",
    "Warehouse",
    "Office",
    "Custom (Enter Below)",
  ];

  // Mounting type options based on equipment type
  const getMountingOptions = () => {
    const equipmentType = equipment?.classification?.equipmentType;

    const panelMountingOptions = [
      "Surface",
      "Flush",
      "Semi-Flush",
      "Within Switchboard",
    ];

    const transformerMountingOptions = [
      "Pole",
      "Pad",
      "Vault",
      "Interior Wall",
      "Floor",
    ];

    const disconnectMountingOptions = [
      "Surface",
      "Recessed",
      "Pole Mount",
      "Pad Mount",
    ];

    if (
      equipmentType === "PANEL_NAMEPLATE" ||
      equipmentType === "PANEL_INTERIOR"
    ) {
      return panelMountingOptions;
    } else if (equipmentType === "TRANSFORMER") {
      return transformerMountingOptions;
    } else if (equipmentType === "SERVICE_DISCONNECT") {
      return disconnectMountingOptions;
    }

    return ["Surface", "Recessed", "Wall Mount", "Floor Mount"];
  };

  const conditionOptions = ["Good", "Fair", "Poor", "Hazardous"];

  const handleInputChange = (field, value) => {
    setUserInputs((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleNestedInputChange = (parentField, childField, value) => {
    setUserInputs((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value,
      },
    }));

    // Clear validation error
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${parentField}.${childField}`];
      return newErrors;
    });
  };

  const handleMountingChange = (value) => {
    setUserInputs((prev) => ({
      ...prev,
      mounting: {
        ...prev.mounting,
        type: value,
        userOverride: value !== prev.mounting.aiSuggested,
      },
    }));
  };

  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!userInputs.designation || userInputs.designation.trim() === "") {
      errors.designation = "Designation is required";
    }

    if (!userInputs.location || userInputs.location.trim() === "") {
      errors.location = "Location is required";
    }

    if (!userInputs.wireSize.phase) {
      errors["wireSize.phase"] = "Phase wire size is required";
    }

    if (!userInputs.wireSize.ground) {
      errors["wireSize.ground"] = "Ground wire size is required";
    }

    if (!userInputs.conduitSize) {
      errors.conduitSize = "Conduit size is required";
    }

    // Validate wire size against amperage (if available)
    if (
      userInputs.wireSize.phase &&
      equipment?.extractedData?.electrical
    ) {
      const amperage = parseAmperage(
        equipment.extractedData.electrical.busRating ||
          equipment.extractedData.electrical.ampRating
      );

      if (amperage > 0) {
        const wireSizeValidation = validateWireSize(
          userInputs.wireSize.phase,
          amperage,
          true // continuous load
        );

        if (!wireSizeValidation.valid) {
          errors["wireSize.phase"] = wireSizeValidation.error;
        }
      }
    }

    // Validate conduit fill
    if (userInputs.wireSize.phase && userInputs.conduitSize) {
      const conductors = [
        { wireSize: userInputs.wireSize.phase, count: 3 }, // 3 phase conductors
      ];

      if (userInputs.wireSize.neutral) {
        conductors.push({ wireSize: userInputs.wireSize.neutral, count: 1 });
      }

      if (userInputs.wireSize.ground) {
        conductors.push({ wireSize: userInputs.wireSize.ground, count: 1 });
      }

      const conduitValidation = validateConduitFill(
        userInputs.conduitSize,
        conductors
      );

      if (!conduitValidation.valid) {
        errors.conduitSize = conduitValidation.error;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(userInputs);
    }
  };

  const getConfidenceBadge = (score) => {
    if (!score) return null;

    const percentage = (score * 100).toFixed(0);
    let color = "#28a745"; // Green
    if (score < 0.7) color = "#ffc107"; // Yellow
    if (score < 0.5) color = "#dc3545"; // Red

    return (
      <span
        style={{
          padding: "2px 8px",
          backgroundColor: color,
          color: "white",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: "bold",
          marginLeft: "8px",
        }}
      >
        {percentage}%
      </span>
    );
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ marginBottom: "25px", borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>
        Review AI-Extracted Data & Provide Details
      </h2>

      {/* AI-Extracted Data Summary */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "30px",
          border: "1px solid #dee2e6",
        }}
      >
        <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>
          AI-Extracted Information:
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            fontSize: "14px",
          }}
        >
          {equipment?.extractedData?.basicInfo && (
            <>
              <div>
                <strong>Manufacturer:</strong>{" "}
                {equipment.extractedData.basicInfo.manufacturer}
                {getConfidenceBadge(
                  equipment.extractedData.confidenceScores?.manufacturer
                )}
              </div>
              <div>
                <strong>Model:</strong>{" "}
                {equipment.extractedData.basicInfo.model}
                {getConfidenceBadge(
                  equipment.extractedData.confidenceScores?.model
                )}
              </div>
            </>
          )}
          {equipment?.extractedData?.electrical && (
            <>
              <div>
                <strong>Voltage:</strong>{" "}
                {equipment.extractedData.electrical.voltage}
                {getConfidenceBadge(
                  equipment.extractedData.confidenceScores?.voltage
                )}
              </div>
              <div>
                <strong>Amperage/Rating:</strong>{" "}
                {equipment.extractedData.electrical.busRating ||
                  equipment.extractedData.electrical.ampRating ||
                  equipment.extractedData.electrical.powerRating}
                {getConfidenceBadge(
                  equipment.extractedData.confidenceScores?.busRating ||
                    equipment.extractedData.confidenceScores?.ampRating ||
                    equipment.extractedData.confidenceScores?.powerRating
                )}
              </div>
            </>
          )}
        </div>

        {equipment?.extractedData?.extractionQuality && (
          <div style={{ marginTop: "15px", fontSize: "13px", color: "#666" }}>
            <strong>Image Quality:</strong>{" "}
            {equipment.extractedData.extractionQuality.nameplateReadability ||
              equipment.extractedData.extractionQuality.meterFaceReadability}
            {equipment.extractedData.extractionQuality.glarePresent && (
              <span style={{ marginLeft: "10px", color: "#856404" }}>
                ⚠️ Glare detected
              </span>
            )}
            {equipment.extractedData.extractionQuality.weatheringDamage && (
              <span style={{ marginLeft: "10px", color: "#856404" }}>
                ⚠️ Weathering damage
              </span>
            )}
          </div>
        )}
      </div>

      {/* User Input Form */}
      <form onSubmit={handleSubmit}>
        <h3
          style={{
            marginBottom: "20px",
            fontSize: "18px",
            color: "#007bff",
          }}
        >
          Additional Information Required:
        </h3>

        {/* Designation */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Equipment Designation <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={userInputs.designation}
            onChange={(e) => handleInputChange("designation", e.target.value)}
            placeholder="e.g., Panel MDP-1, Transformer T-1, Service Disconnect SD-1"
            style={{
              width: "100%",
              padding: "10px",
              border: validationErrors.designation
                ? "2px solid #dc3545"
                : "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
          {validationErrors.designation && (
            <span style={{ color: "#dc3545", fontSize: "12px" }}>
              {validationErrors.designation}
            </span>
          )}
        </div>

        {/* Location */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Location <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={userInputs.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: validationErrors.location
                ? "2px solid #dc3545"
                : "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="">Select location...</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {validationErrors.location && (
            <span style={{ color: "#dc3545", fontSize: "12px" }}>
              {validationErrors.location}
            </span>
          )}
          {userInputs.location === "Custom (Enter Below)" && (
            <input
              type="text"
              placeholder="Enter custom location..."
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ced4da",
                borderRadius: "4px",
                fontSize: "14px",
                marginTop: "10px",
              }}
              onChange={(e) => handleInputChange("location", e.target.value)}
            />
          )}
        </div>

        {/* Mounting Type */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Mounting Type
            {userInputs.mounting.aiSuggested && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#6c757d",
                  marginLeft: "10px",
                }}
              >
                (AI suggested: {userInputs.mounting.aiSuggested})
              </span>
            )}
          </label>
          <select
            value={userInputs.mounting.type}
            onChange={(e) => handleMountingChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: userInputs.mounting.userOverride
                ? "2px solid #ffc107"
                : "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="">Select mounting type...</option>
            {getMountingOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {userInputs.mounting.userOverride && (
            <span
              style={{
                color: "#856404",
                fontSize: "12px",
                display: "block",
                marginTop: "5px",
              }}
            >
              ⚠️ You've overridden the AI suggestion
            </span>
          )}
        </div>

        {/* Wire Sizes */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Conductor Wire Sizes <span style={{ color: "red" }}>*</span>
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Phase <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={userInputs.wireSize.phase}
                onChange={(e) =>
                  handleNestedInputChange("wireSize", "phase", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: validationErrors["wireSize.phase"]
                    ? "2px solid #dc3545"
                    : "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Select...</option>
                {wireSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              {validationErrors["wireSize.phase"] && (
                <span style={{ color: "#dc3545", fontSize: "11px" }}>
                  {validationErrors["wireSize.phase"]}
                </span>
              )}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Neutral
              </label>
              <select
                value={userInputs.wireSize.neutral}
                onChange={(e) =>
                  handleNestedInputChange("wireSize", "neutral", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Select...</option>
                {wireSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Ground <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={userInputs.wireSize.ground}
                onChange={(e) =>
                  handleNestedInputChange("wireSize", "ground", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: validationErrors["wireSize.ground"]
                    ? "2px solid #dc3545"
                    : "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Select...</option>
                {wireSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              {validationErrors["wireSize.ground"] && (
                <span style={{ color: "#dc3545", fontSize: "11px" }}>
                  {validationErrors["wireSize.ground"]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conduit Size */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Conduit Size <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={userInputs.conduitSize}
            onChange={(e) => handleInputChange("conduitSize", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: validationErrors.conduitSize
                ? "2px solid #dc3545"
                : "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="">Select conduit size...</option>
            {conduitSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {validationErrors.conduitSize && (
            <span style={{ color: "#dc3545", fontSize: "12px" }}>
              {validationErrors.conduitSize}
            </span>
          )}
        </div>

        {/* Physical Dimensions */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Physical Dimensions (inches)
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "15px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Width
              </label>
              <input
                type="number"
                value={userInputs.physicalDimensions.width}
                onChange={(e) =>
                  handleNestedInputChange(
                    "physicalDimensions",
                    "width",
                    e.target.value
                  )
                }
                placeholder="24"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Height
              </label>
              <input
                type="number"
                value={userInputs.physicalDimensions.height}
                onChange={(e) =>
                  handleNestedInputChange(
                    "physicalDimensions",
                    "height",
                    e.target.value
                  )
                }
                placeholder="48"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Depth
              </label>
              <input
                type="number"
                value={userInputs.physicalDimensions.depth}
                onChange={(e) =>
                  handleNestedInputChange(
                    "physicalDimensions",
                    "depth",
                    e.target.value
                  )
                }
                placeholder="6"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                From Wall
              </label>
              <input
                type="number"
                value={userInputs.physicalDimensions.distanceFromWall}
                onChange={(e) =>
                  handleNestedInputChange(
                    "physicalDimensions",
                    "distanceFromWall",
                    e.target.value
                  )
                }
                placeholder="12"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Condition */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Condition <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={userInputs.condition}
            onChange={(e) => handleInputChange("condition", e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            {conditionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Additional Notes
          </label>
          <textarea
            value={userInputs.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Any additional observations or notes..."
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
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
            Cancel
          </button>
          <button
            type="submit"
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
            Save Equipment Details
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostExtractionInputForm;
