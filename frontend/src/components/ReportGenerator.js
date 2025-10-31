// frontend/src/components/ReportGenerator.js - Enhanced for Live Preview with Editing
import React, { useState, useEffect } from "react";

const ReportGenerator = ({ project, squareFootage, isLivePreview = false, currentExtractedData = null, currentRTUNumber = null, currentUserInputs = null }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState("");
  const [editingRTUs, setEditingRTUs] = useState({}); // Track which RTUs are being edited
  const [editedRTUData, setEditedRTUData] = useState({}); // Store edited RTU data

  // Track only when editing state changes
  useEffect(() => {
    if (Object.keys(editingRTUs).length > 0) {
      console.log("=== EDITING STATE ACTIVE ===");
      console.log("Currently editing RTUs:", editingRTUs);
      console.log("Edited data:", editedRTUData);
    }
  }, [editingRTUs, editedRTUData]);

  // Early return must come after all hooks to comply with Rules of Hooks
  // Memoize savedRTUs to prevent unnecessary re-renders
  const savedRTUs = React.useMemo(() => project?.rtus || [], [project?.rtus]);

  // If we have current extracted data, create a temporary RTU object and add it to the list
  // Use useMemo to prevent creating new objects on every render
  const rtus = React.useMemo(() => {
    if (currentExtractedData) {
      return [
        ...savedRTUs,
        {
          id: `temp-${currentRTUNumber}`,
          number: currentRTUNumber,
          data: {
            ...currentExtractedData,
            condition: currentUserInputs?.condition || "Good",
            heatType: currentUserInputs?.heatType || "Electric",
            gasPipeSize: currentUserInputs?.heatType === "Gas" ? currentUserInputs?.gasPipeSize : null,
          }
        }
      ];
    }
    return savedRTUs;
  }, [savedRTUs, currentExtractedData, currentRTUNumber, currentUserInputs]);

  const rtuCount = rtus.length;

  // Helper to safely extract data from nested structure
  // If the RTU has been edited, use the edited data
  const extractRTUData = (rtu) => {
    // Check if we have edited data for this RTU
    if (editedRTUData[rtu.id]) {
      return editedRTUData[rtu.id];
    }

    const data = rtu.data || {};

    // Handle both old flat structure and new nested structure
    return {
      manufacturer:
        data.basicInfo?.manufacturer || data.manufacturer || "Unknown",
      model: data.basicInfo?.model || data.model || "Unknown",
      serialNumber: data.basicInfo?.serialNumber || data.serialNumber || "",
      year:
        data.basicInfo?.manufacturingYear ||
        data.manufacturingYear ||
        "Unknown",
      age: data.basicInfo?.currentAge || data.currentAge || 0,
      tonnage: data.cooling?.tonnage || data.tonnage || "Unknown tonnage",
      serviceLifeAssessment:
        data.serviceLife?.assessment || data.serviceLifeAssessment || "",
      recommendation:
        data.serviceLife?.recommendation || data.recommendation || "",
      heatType: data.heatType || "Unknown",
      gasPipeSize: data.gasPipeSize || null,
    };
  };

  // Convert number to word
  const numberToWord = (num) => {
    const words = [
      "",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    return words[num] || num.toString();
  };

  // Calculate total tonnage
  const calculateTotalTonnage = () => {
    let total = 0;
    rtus.forEach((rtu) => {
      const rtuData = extractRTUData(rtu);
      const tonnage = rtuData.tonnage || "";
      const match = tonnage.match(/(\d+\.?\d*)/);
      if (match) {
        total += parseFloat(match[1]);
      }
    });
    return total;
  };

  const totalTonnage = calculateTotalTonnage();

  // Calculate cooling estimate from square footage
  const estimateCooling = () => {
    if (!squareFootage) return null;
    const sqft = parseFloat(squareFootage);
    const lowEstimate = (sqft / 600).toFixed(1);
    const highEstimate = (sqft / 400).toFixed(1);
    return `${lowEstimate} to ${highEstimate}`;
  };

  const coolingEstimate = estimateCooling();

  // Check if any RTU is beyond service life
  const hasOldUnits = rtus.some((rtu) => {
    const rtuData = extractRTUData(rtu);
    return rtuData.age && rtuData.age > 15;
  });

  // Generate RTU descriptions with heat type and gas pipe size
  const generateRTUDescriptions = () => {
    const ordinals = [
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
      "eighth",
    ];

    return rtus
      .map((rtu, index) => {
        const rtuData = extractRTUData(rtu);
        const ordinal = ordinals[index] || `${index + 1}th`;
        const tonnage = rtuData.tonnage;
        const manufacturer = rtuData.manufacturer;
        const year = rtuData.year;
        const heatType = rtuData.heatType;
        const gasPipeSize = rtuData.gasPipeSize;

        // Build description with proper formatting for illegible data
        let description = `The ${ordinal} unit is ${
          tonnage.match(/\d/) ? "an" : "a"
        } ${tonnage} ${heatType === "Electric" ? "electric" : "gas-fired"} model manufactured by ${manufacturer}`;

        // Only add year if it's legible and not "Unknown" or "Not Available"
        if (year && year !== "Unknown" && year !== "Not legible" && year !== "Not Available") {
          description += ` in ${year}`;
        } else if (year === "Not legible") {
          description += ` (manufacturing year not legible on nameplate)`;
        }

        // Add gas pipe size if it's a gas unit and we have the size
        if (heatType === "Gas" && gasPipeSize) {
          description += ` with a ${gasPipeSize} gas line`;
        }

        description += ".";

        return description;
      })
      .join(" ");
  };

  // Generate replacement recommendation
  const generateReplacementText = () => {
    if (!hasOldUnits) {
      return "With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, the units are within their expected service life.";
    }

    const oldCount = rtus.filter((rtu) => {
      const rtuData = extractRTUData(rtu);
      return rtuData.age && rtuData.age > 15;
    }).length;

    if (oldCount === rtuCount) {
      return `With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, ${
        rtuCount === 1 ? "this unit" : "both units"
      } would be recommended to be replaced.`;
    } else {
      return `With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, ${
        oldCount === 1 ? "one unit" : `${numberToWord(oldCount)} units`
      } would be recommended to be replaced.`;
    }
  };

  // Count gas units and electric units separately
  const gasUnitsCount = rtus.filter(rtu => {
    const rtuData = extractRTUData(rtu);
    return rtuData.heatType === "Gas";
  }).length;

  const electricUnitsCount = rtus.filter(rtu => {
    const rtuData = extractRTUData(rtu);
    return rtuData.heatType === "Electric";
  }).length;

  // Generate opening sentence based on unit types
  const generateOpeningSentence = () => {
    if (gasUnitsCount > 0 && electricUnitsCount > 0) {
      // Mixed units
      return `The proposed space is served by ${numberToWord(gasUnitsCount)} single packaged gas-fired roof top unit${gasUnitsCount > 1 ? "s" : ""} and ${numberToWord(electricUnitsCount)} electric roof top unit${electricUnitsCount > 1 ? "s" : ""}.`;
    } else if (gasUnitsCount > 0) {
      // All gas units
      return `The proposed space is served by ${numberToWord(gasUnitsCount)} single packaged gas-fired roof top unit${gasUnitsCount > 1 ? "s" : ""}.`;
    } else if (electricUnitsCount > 0) {
      // All electric units
      return `The proposed space is served by ${numberToWord(electricUnitsCount)} single packaged electric roof top unit${electricUnitsCount > 1 ? "s" : ""}.`;
    } else {
      // Unknown type (fallback)
      return `The proposed space is served by ${numberToWord(rtuCount)} single packaged roof top unit${rtuCount > 1 ? "s" : ""}.`;
    }
  };

  const mechanicalSystemsReport = `${generateOpeningSentence()} ${generateRTUDescriptions()} ${generateReplacementText()}${
    squareFootage
      ? ` With the proposed space being approximately ${parseFloat(
          squareFootage
        ).toLocaleString()}sq.ft., Schnackel Engineers estimates ${coolingEstimate}-tons of cooling will be required, however complete heat gain/loss calculations will be performed to determine the exact amount of cooling required.`
      : ""
  } The majority of ductwork in the space is interior insulated rectangular sheet metal ductwork with insulated flexible diffuser connections.`;

  // Update edited report when mechanicalSystemsReport changes (new RTUs added or edited)
  useEffect(() => {
    setEditedReport(mechanicalSystemsReport);
  }, [mechanicalSystemsReport, editedRTUData]);

  // Handle RTU editing
  const startEditingRTU = (rtuId) => {
    const rtu = rtus.find(r => r.id === rtuId);
    if (rtu) {
      const rtuData = extractRTUData(rtu);
      console.log("Starting edit for RTU:", rtuId, "with data:", rtuData);

      // Use functional updates to ensure state is set correctly
      setEditedRTUData((prev) => ({ ...prev, [rtuId]: rtuData }));
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: true }));
    }
  };

  const updateRTUField = (rtuId, field, value) => {
    console.log("=== UPDATE RTU FIELD ===");
    console.log("RTU ID:", rtuId);
    console.log("Field:", field);
    console.log("New value:", value);

    setEditedRTUData((prev) => {
      console.log("Previous editedRTUData:", prev);
      const updated = {
        ...prev,
        [rtuId]: {
          ...(prev[rtuId] || {}),
          [field]: value
        }
      };
      console.log("Updated editedRTUData:", updated);
      return updated;
    });
  };

  const saveRTUEdit = (rtuId) => {
    // Handle temp RTUs (live preview) - just update local state, will be saved when user clicks "Save & Add RTU"
    if (rtuId.startsWith('temp-')) {
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
      // The edited data stays in editedRTUData and will be used in display
      return;
    }

    try {
      const savedProjects = localStorage.getItem("mep-survey-projects");
      if (!savedProjects) {
        alert("Error: No projects found in storage");
        return;
      }

      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === project.id);

      if (projectIndex === -1) {
        alert("Error: Project not found");
        return;
      }

      const rtuIndex = projects[projectIndex].rtus.findIndex((r) => r.id === rtuId);
      if (rtuIndex === -1) {
        alert("Error: RTU not found");
        return;
      }

      // Update the RTU data with edited values
      const updatedData = editedRTUData[rtuId];

      // Validate that we have edited data
      if (!updatedData) {
        alert("Error: No edited data found for this RTU. Please try editing again.");
        console.error("Missing edited data for RTU:", rtuId);
        console.error("Current editedRTUData:", editedRTUData);
        setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
        return;
      }
      const originalRTU = projects[projectIndex].rtus[rtuIndex];

      console.log("=== SAVE RTU EDIT DEBUG ===");
      console.log("Before save - Total RTU count:", projects[projectIndex].rtus.length);
      console.log("Updating RTU ID:", rtuId);
      console.log("Updating RTU at index:", rtuIndex);
      console.log("Updated data:", updatedData);

      // IMPORTANT: Preserve ALL original data, only update the specific fields
      const updatedRTU = {
        ...originalRTU,
        data: {
          ...originalRTU.data,
          basicInfo: {
            ...(originalRTU.data?.basicInfo || {}),
            manufacturer: updatedData.manufacturer,
            model: updatedData.model,
            manufacturingYear: updatedData.year,
            currentAge: parseInt(updatedData.age) || 0,
          },
          cooling: {
            ...(originalRTU.data?.cooling || {}),
            tonnage: updatedData.tonnage,
          },
        },
      };

      // Replace only the specific RTU, keeping all others intact
      projects[projectIndex].rtus[rtuIndex] = updatedRTU;
      projects[projectIndex].lastModified = new Date().toISOString();

      console.log("After update - Total RTU count:", projects[projectIndex].rtus.length);
      console.log("All RTU IDs:", projects[projectIndex].rtus.map(r => ({ id: r.id, number: r.number })));

      // Save to localStorage
      localStorage.setItem("mep-survey-projects", JSON.stringify(projects));
      console.log("Saved to localStorage successfully");

      // Verify the save
      const verification = JSON.parse(localStorage.getItem("mep-survey-projects"));
      const verifiedProject = verification.find(p => p.id === project.id);
      console.log("Verification - RTU count after save:", verifiedProject.rtus.length);
      console.log("=== END DEBUG ===");

      // Exit edit mode
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));

      alert(`RTU saved successfully! RTU count: ${verifiedProject.rtus.length}\n\nThe page will now reload to show your changes.`);

      // Reload after user clicks OK
      window.location.reload();
    } catch (error) {
      console.error("Error saving RTU edit:", error);
      alert(`Error saving RTU: ${error.message}\n\nCheck console for details.`);
    }
  };

  const cancelRTUEdit = (rtuId) => {
    setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
    setEditedRTUData((prev) => {
      const newData = { ...prev };
      delete newData[rtuId];
      return newData;
    });
  };

  // Early return after all hooks to comply with Rules of Hooks
  if (!project || (rtus.length === 0 && !currentExtractedData)) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <h3>No RTUs to Report</h3>
        <p>Capture RTU nameplates to generate the report.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Live Preview Badge */}
      {isLivePreview && (
        <div
          style={{
            backgroundColor: "#28a745",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          🔴 LIVE REPORT PREVIEW • {rtuCount} RTU{rtuCount > 1 ? "s" : ""}{" "}
          Captured
        </div>
      )}

      {/* Schnackel Header */}
      <div
        style={{
          borderBottom: "2px solid #333",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#007bff",
            marginBottom: "5px",
          }}
        >
          SCHNACKEL ENGINEERS
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>MEP Survey Report</div>
      </div>

      {/* Date and Project Info */}
      <div style={{ marginBottom: "30px", fontSize: "14px" }}>
        <p>
          <strong>DATE:</strong> {new Date().toLocaleDateString()}
        </p>
        <p>
          <strong>Client Name:</strong> {project.clientName || "[Client Name]"}
        </p>
        <p>
          <strong>Company Address:</strong> {project.address || "[Address]"}
        </p>
        <p>
          <strong>RE: Project Name:</strong> {project.name}
        </p>
        <p>
          <strong>Schnackel Project No.:</strong> {project.projectNumber}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <p>Dear {project.clientName || "Client"}:</p>
        <p>
          I visited the proposed {project.name} on{" "}
          {new Date(project.surveyDate).toLocaleDateString()}. The following is
          summary of the mechanical, electrical, and plumbing systems at this
          location. The proposed space consisted of a single space which was
          vacant at the time of my visit.
        </p>
      </div>

      {/* Investigation Performed By */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "10px",
            textDecoration: "underline",
          }}
        >
          Survey Performed by:
        </h3>
        <p>{project.surveyorName || "Surveyor Name"}</p>
        <p>Schnackel Engineers</p>
        <p>Telephone No. 402-391-7680, Fax No. 402-391-7488</p>
      </div>

      {/* Site Address */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "10px",
            textDecoration: "underline",
          }}
        >
          Site Address:
        </h3>
        <p>{project.address || "[Site Address]"}</p>
        {squareFootage && (
          <p>
            Approximate Area: {parseFloat(squareFootage).toLocaleString()}{" "}
            sq.ft.
          </p>
        )}
      </div>

      {/* Mechanical Systems - THE MAIN CONTENT WITH EDITING */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              margin: 0,
              textDecoration: "underline",
            }}
          >
            Mechanical Systems:
          </h3>
          {isLivePreview && (
            <button
              onClick={() => {
                if (isEditing) {
                  // Save edit
                  setIsEditing(false);
                } else {
                  // Start editing
                  setIsEditing(true);
                }
              }}
              className="btn"
              style={{
                padding: "5px 15px",
                fontSize: "12px",
                backgroundColor: isEditing ? "#28a745" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {isEditing ? "✓ Save" : "✏️ Edit"}
            </button>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editedReport}
            onChange={(e) => setEditedReport(e.target.value)}
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "10px",
              fontSize: "14px",
              lineHeight: "1.6",
              border: "2px solid #007bff",
              borderRadius: "4px",
              fontFamily: "inherit",
              resize: "vertical"
            }}
          />
        ) : (
          <p
            style={{
              textAlign: "justify",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            {editedReport}
          </p>
        )}
      </div>

      {/* RTU Summary Table */}
      <div style={{ marginTop: "30px" }}>
        <h4 style={{ marginBottom: "15px" }}>Equipment Summary:</h4>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                RTU #
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Manufacturer
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Model
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Capacity
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Year
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Age
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Status
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rtus.map((rtu, index) => {
              const rtuData = extractRTUData(rtu);
              const isEditingThisRTU = editingRTUs[rtu.id];

              // For temp RTUs (live preview), always use edited data if it exists
              // For saved RTUs, only use edited data when actively editing
              const isTempRTU = rtu.id.startsWith('temp-');
              const displayData = (isTempRTU && editedRTUData[rtu.id]) || (isEditingThisRTU && editedRTUData[rtu.id])
                ? editedRTUData[rtu.id]
                : rtuData;

              return (
                <tr key={rtu.id}>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    #{rtu.number}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.manufacturer}
                        onChange={(e) => updateRTUField(rtu.id, 'manufacturer', e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "13px" }}
                      />
                    ) : (
                      rtuData.manufacturer
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.model}
                        onChange={(e) => updateRTUField(rtu.id, 'model', e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "13px" }}
                      />
                    ) : (
                      rtuData.model
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.tonnage}
                        onChange={(e) => updateRTUField(rtu.id, 'tonnage', e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "13px" }}
                      />
                    ) : (
                      rtuData.tonnage
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.year}
                        onChange={(e) => updateRTUField(rtu.id, 'year', e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "13px" }}
                      />
                    ) : (
                      rtuData.year
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="number"
                        value={displayData.age}
                        onChange={(e) => updateRTUField(rtu.id, 'age', e.target.value)}
                        style={{ width: "60px", padding: "4px", fontSize: "13px" }}
                      />
                    ) : (
                      `${rtuData.age} years`
                    )}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "10px",
                      color: rtuData.age > 15 ? "#d32f2f" : "#388e3c",
                      fontWeight: "bold",
                    }}
                  >
                    {rtuData.age > 15 ? "Replace" : "OK"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>
                    {isEditingThisRTU ? (
                      <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                        <button
                          onClick={() => saveRTUEdit(rtu.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={() => cancelRTUEdit(rtu.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingRTU(rtu.id)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        title="Edit RTU"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
              <td
                colSpan="3"
                style={{ border: "1px solid #ddd", padding: "10px" }}
              >
                Total Cooling Capacity
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                {totalTonnage.toFixed(1)} tons
              </td>
              <td
                colSpan="4"
                style={{ border: "1px solid #ddd", padding: "10px" }}
              >
                {coolingEstimate && `Estimated Need: ${coolingEstimate} tons`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export Buttons - Only show when not in live preview */}
      {!isLivePreview && (
        <div
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "2px solid #ddd",
            display: "flex",
            gap: "15px",
          }}
        >
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ flex: 1, padding: "12px" }}
          >
            🖨️ Print Report
          </button>
          <button
            onClick={() => {
              const reportText = document.querySelector(".card").innerText;
              const blob = new Blob([reportText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.projectNumber}_MEP_Report.txt`;
              a.click();
            }}
            className="btn"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#28a745",
              color: "white",
            }}
          >
            💾 Export Report
          </button>
        </div>
      )}

      {/* Report Metadata */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <p style={{ margin: "0 0 5px 0" }}>
          <strong>Report Generated:</strong> {new Date().toLocaleString()}
        </p>
        <p style={{ margin: "0 0 5px 0" }}>
          <strong>RTUs Analyzed:</strong> {rtuCount}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Survey Date:</strong>{" "}
          {new Date(project.surveyDate).toLocaleDateString()}
        </p>
        {isLivePreview && (
          <p
            style={{
              margin: "10px 0 0 0",
              color: "#28a745",
              fontWeight: "bold",
            }}
          >
            ⚡ This report updates automatically as you capture RTUs
          </p>
        )}
      </div>
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(ReportGenerator, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props actually changed
  return (
    prevProps.project === nextProps.project &&
    prevProps.squareFootage === nextProps.squareFootage &&
    prevProps.isLivePreview === nextProps.isLivePreview &&
    prevProps.currentExtractedData === nextProps.currentExtractedData &&
    prevProps.currentRTUNumber === nextProps.currentRTUNumber &&
    JSON.stringify(prevProps.currentUserInputs) === JSON.stringify(nextProps.currentUserInputs)
  );
});
