// frontend/src/components/TestingReportView.js
// Testing and diagnostics report with confidence scores and extraction quality analysis

import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./TestingReportView.css";

const TestingReportView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    statistics: true,
    confidence: true,
    quality: true,
    missing: true,
    actions: true,
  });

  // Load project data
  const project = useMemo(() => {
    const projects = JSON.parse(localStorage.getItem("mep-survey-projects") || "[]");
    return projects.find((p) => p.id === projectId);
  }, [projectId]);

  // Get all electrical equipment (new and old format)
  const equipment = useMemo(() => {
    if (!project) return [];

    // Prefer new format
    if (project.electricalEquipment && project.electricalEquipment.length > 0) {
      return project.electricalEquipment;
    }

    // Convert old format on the fly
    const converted = [];

    if (project.transformers) {
      project.transformers.forEach((t, index) => {
        converted.push({
          id: t.id,
          type: "transformer",
          equipmentNumber: index + 1,
          aiExtractedData: t.data,
          userInputs: {
            designation: t.data?.transformerDesignation || "",
            location: t.data?.transformerLocation || "",
          },
          nameplateImages: t.images || [],
          capturedAt: new Date().toISOString(),
        });
      });
    }

    if (project.electricalPanels) {
      project.electricalPanels.forEach((p, index) => {
        converted.push({
          id: p.id,
          type: "panel",
          equipmentNumber: index + 1,
          aiExtractedData: p.data,
          userInputs: {
            designation: p.data?.panelDesignation || "",
            location: p.data?.panelLocation || "",
          },
          nameplateImages: p.images || [],
          capturedAt: new Date().toISOString(),
        });
      });
    }

    return converted;
  }, [project]);

  // Calculate overall statistics
  const statistics = useMemo(() => {
    if (!equipment || equipment.length === 0) {
      return {
        totalEquipment: 0,
        byType: {},
        averageConfidence: 0,
        extractionCompleteness: 0,
        totalValidationWarnings: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
      };
    }

    const byType = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalFields = 0;
    let extractedFields = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    equipment.forEach((eq) => {
      // Count by type
      byType[eq.type] = (byType[eq.type] || 0) + 1;

      // Calculate confidence scores
      const confidenceScores = eq.aiExtractedData?.confidenceScores || {};
      const overallConfidence = confidenceScores.overall || 0;

      if (overallConfidence > 0) {
        totalConfidence += overallConfidence;
        confidenceCount++;

        if (overallConfidence >= 0.9) highConfidence++;
        else if (overallConfidence >= 0.7) mediumConfidence++;
        else lowConfidence++;
      }

      // Calculate extraction completeness
      const extractedData = eq.aiExtractedData;
      if (extractedData) {
        const fields = [
          extractedData.basicInfo?.manufacturer,
          extractedData.basicInfo?.model,
          extractedData.electrical?.voltage,
          extractedData.electrical?.busRating || extractedData.electrical?.ampRating,
        ];

        fields.forEach((field) => {
          totalFields++;
          if (field && field !== "Unknown" && field !== "Not Available" && field !== "Not legible") {
            extractedFields++;
          }
        });
      }
    });

    return {
      totalEquipment: equipment.length,
      byType: byType,
      averageConfidence: confidenceCount > 0 ? (totalConfidence / confidenceCount) : 0,
      extractionCompleteness: totalFields > 0 ? (extractedFields / totalFields) * 100 : 0,
      totalValidationWarnings: project?.electricalSummary?.totalValidationWarnings || 0,
      highConfidenceCount: highConfidence,
      mediumConfidenceCount: mediumConfidence,
      lowConfidenceCount: lowConfidence,
    };
  }, [equipment, project]);

  // Extraction quality analysis
  const qualityIssues = useMemo(() => {
    const issues = {
      glare: [],
      focusIssues: [],
      partialOcclusion: [],
      weatheringDamage: [],
      poorReadability: [],
    };

    equipment.forEach((eq) => {
      const quality = eq.aiExtractedData?.extractionQuality || {};

      if (quality.glarePresent) {
        issues.glare.push({ equipmentId: eq.id, designation: eq.userInputs?.designation || eq.type });
      }
      if (quality.focusIssues) {
        issues.focusIssues.push({ equipmentId: eq.id, designation: eq.userInputs?.designation || eq.type });
      }
      if (quality.partialOcclusion) {
        issues.partialOcclusion.push({ equipmentId: eq.id, designation: eq.userInputs?.designation || eq.type });
      }
      if (quality.weatheringDamage) {
        issues.weatheringDamage.push({ equipmentId: eq.id, designation: eq.userInputs?.designation || eq.type });
      }
      if (quality.nameplateReadability === "POOR") {
        issues.poorReadability.push({ equipmentId: eq.id, designation: eq.userInputs?.designation || eq.type });
      }
    });

    return issues;
  }, [equipment]);

  // Missing fields analysis
  const missingFieldsAnalysis = useMemo(() => {
    const analysis = [];

    equipment.forEach((eq) => {
      const missingFields = eq.aiExtractedData?.missingFields || [];
      if (missingFields.length > 0) {
        analysis.push({
          equipmentId: eq.id,
          designation: eq.userInputs?.designation || `${eq.type} #${eq.equipmentNumber}`,
          type: eq.type,
          missingFields: missingFields,
          recommendations: eq.aiExtractedData?.recommendedFollowup || [],
        });
      }
    });

    return analysis;
  }, [equipment]);

  // Recommended actions
  const recommendedActions = useMemo(() => {
    const actions = [];

    // Actions based on quality issues
    if (qualityIssues.glare.length > 0) {
      actions.push({
        priority: "high",
        action: "Retake photos with glare",
        count: qualityIssues.glare.length,
        details: `${qualityIssues.glare.length} equipment photo(s) affected by glare. Retake in different lighting or angle.`,
        equipmentList: qualityIssues.glare,
      });
    }

    if (qualityIssues.focusIssues.length > 0) {
      actions.push({
        priority: "high",
        action: "Retake out-of-focus photos",
        count: qualityIssues.focusIssues.length,
        details: `${qualityIssues.focusIssues.length} equipment photo(s) have focus issues. Ensure camera focuses on nameplate.`,
        equipmentList: qualityIssues.focusIssues,
      });
    }

    // Actions based on missing fields
    if (missingFieldsAnalysis.length > 0) {
      actions.push({
        priority: "medium",
        action: "Field verify missing data",
        count: missingFieldsAnalysis.length,
        details: `${missingFieldsAnalysis.length} equipment piece(s) have missing fields requiring field verification.`,
        equipmentList: missingFieldsAnalysis,
      });
    }

    // Actions based on low confidence
    if (statistics.lowConfidenceCount > 0) {
      actions.push({
        priority: "medium",
        action: "Verify low-confidence extractions",
        count: statistics.lowConfidenceCount,
        details: `${statistics.lowConfidenceCount} equipment piece(s) have low confidence scores (<70%). Review and verify data.`,
      });
    }

    return actions.sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });
  }, [qualityIssues, missingFieldsAnalysis, statistics]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "#28a745";
    if (confidence >= 0.7) return "#ffc107";
    if (confidence >= 0.5) return "#fd7e14";
    return "#dc3545";
  };

  const exportToJSON = () => {
    const exportData = {
      projectId: project.id,
      projectName: project.name,
      exportDate: new Date().toISOString(),
      statistics: statistics,
      equipment: equipment.map((eq) => ({
        id: eq.id,
        type: eq.type,
        designation: eq.userInputs?.designation,
        location: eq.userInputs?.location,
        aiExtractedData: eq.aiExtractedData,
        confidenceScores: eq.aiExtractedData?.confidenceScores,
        extractionQuality: eq.aiExtractedData?.extractionQuality,
      })),
      qualityIssues: qualityIssues,
      missingFields: missingFieldsAnalysis,
      recommendedActions: recommendedActions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}_testing_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!project) {
    return (
      <div className="container" style={{ padding: "40px 20px" }}>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>Project not found</h2>
          <button onClick={() => navigate("/")} className="btn btn-primary" style={{ marginTop: "20px" }}>
            Return to Projects
          </button>
        </div>
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="container" style={{ padding: "40px 20px" }}>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>No Equipment Data</h2>
          <p style={{ color: "#666", marginTop: "10px" }}>
            No electrical equipment has been surveyed for this project yet.
          </p>
          <button onClick={() => navigate(`/advanced-electrical/${projectId}`)} className="btn btn-primary" style={{ marginTop: "20px" }}>
            Start Survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="testing-report-view">
      <div className="container" style={{ maxWidth: "1400px", padding: "40px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginBottom: "15px",
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "28px", color: "#333" }}>
            Testing & Diagnostics Report
          </h1>
          <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
            Project: {project.name} | Equipment Count: {equipment.length}
          </p>
        </div>

        {/* Overall Statistics Section */}
        <div className="report-section" style={{ marginBottom: "30px" }}>
          <div
            className="section-header"
            onClick={() => toggleSection("statistics")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Overall Statistics</h2>
            <span style={{ fontSize: "18px" }}>{expandedSections.statistics ? "▼" : "▶"}</span>
          </div>

          {expandedSections.statistics && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #dee2e6",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                }}
              >
                <div className="stat-card">
                  <div style={{ fontSize: "36px", fontWeight: "bold", color: "#007bff" }}>
                    {statistics.totalEquipment}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6c757d", marginTop: "5px" }}>
                    Total Equipment
                  </div>
                </div>

                <div className="stat-card">
                  <div
                    style={{
                      fontSize: "36px",
                      fontWeight: "bold",
                      color: getConfidenceColor(statistics.averageConfidence),
                    }}
                  >
                    {(statistics.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: "14px", color: "#6c757d", marginTop: "5px" }}>
                    Avg Confidence
                  </div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: "36px", fontWeight: "bold", color: "#28a745" }}>
                    {statistics.extractionCompleteness.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: "14px", color: "#6c757d", marginTop: "5px" }}>
                    Data Completeness
                  </div>
                </div>

                <div className="stat-card">
                  <div
                    style={{
                      fontSize: "36px",
                      fontWeight: "bold",
                      color: statistics.totalValidationWarnings > 0 ? "#ffc107" : "#28a745",
                    }}
                  >
                    {statistics.totalValidationWarnings}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6c757d", marginTop: "5px" }}>
                    Validation Warnings
                  </div>
                </div>
              </div>

              {/* Equipment by Type */}
              <div style={{ marginTop: "30px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "15px" }}>Equipment by Type</h3>
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                  {Object.entries(statistics.byType).map(([type, count]) => (
                    <div
                      key={type}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#e9ecef",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <strong>{type}:</strong> {count}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Distribution */}
              <div style={{ marginTop: "30px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "15px" }}>Confidence Distribution</h3>
                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{ flex: 1, padding: "15px", backgroundColor: "#d4edda", borderRadius: "6px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
                      {statistics.highConfidenceCount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#155724", marginTop: "5px" }}>
                      High (≥90%)
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "15px", backgroundColor: "#fff3cd", borderRadius: "6px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>
                      {statistics.mediumConfidenceCount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#856404", marginTop: "5px" }}>
                      Medium (70-89%)
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "15px", backgroundColor: "#f8d7da", borderRadius: "6px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
                      {statistics.lowConfidenceCount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#721c24", marginTop: "5px" }}>
                      {"Low (<70%)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confidence Breakdown Section */}
        <div className="report-section" style={{ marginBottom: "30px" }}>
          <div
            className="section-header"
            onClick={() => toggleSection("confidence")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Confidence Breakdown</h2>
            <span style={{ fontSize: "18px" }}>{expandedSections.confidence ? "▼" : "▶"}</span>
          </div>

          {expandedSections.confidence && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #dee2e6",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "white",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                      Equipment
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                      Type
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Overall
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Manufacturer
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Model
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Voltage
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Amperage
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((eq, index) => {
                    const scores = eq.aiExtractedData?.confidenceScores || {};
                    const overall = scores.overall || 0;

                    return (
                      <tr key={eq.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                        <td style={{ padding: "12px" }}>
                          {eq.userInputs?.designation || `${eq.type} #${eq.equipmentNumber}`}
                        </td>
                        <td style={{ padding: "12px", textTransform: "capitalize" }}>{eq.type}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              backgroundColor: `${getConfidenceColor(overall)}20`,
                              color: getConfidenceColor(overall),
                              fontWeight: "bold",
                            }}
                          >
                            {(overall * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {scores.manufacturer ? (
                            <span style={{ color: getConfidenceColor(scores.manufacturer) }}>
                              {(scores.manufacturer * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {scores.model ? (
                            <span style={{ color: getConfidenceColor(scores.model) }}>
                              {(scores.model * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {scores.voltage ? (
                            <span style={{ color: getConfidenceColor(scores.voltage) }}>
                              {(scores.voltage * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {scores.busRating || scores.ampRating ? (
                            <span
                              style={{
                                color: getConfidenceColor(scores.busRating || scores.ampRating),
                              }}
                            >
                              {((scores.busRating || scores.ampRating) * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button
                            onClick={() => setSelectedEquipment(eq)}
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Extraction Quality Section */}
        <div className="report-section" style={{ marginBottom: "30px" }}>
          <div
            className="section-header"
            onClick={() => toggleSection("quality")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Extraction Quality Report</h2>
            <span style={{ fontSize: "18px" }}>{expandedSections.quality ? "▼" : "▶"}</span>
          </div>

          {expandedSections.quality && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #dee2e6",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "white",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    backgroundColor: qualityIssues.glare.length > 0 ? "#fff3cd" : "#f8f9fa",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>☀️</span>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>Glare Detected</div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        {qualityIssues.glare.length} equipment
                      </div>
                    </div>
                  </div>
                  {qualityIssues.glare.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#856404" }}>
                      {qualityIssues.glare.map((eq) => eq.designation).join(", ")}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    backgroundColor: qualityIssues.focusIssues.length > 0 ? "#fff3cd" : "#f8f9fa",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>📷</span>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>Focus Issues</div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        {qualityIssues.focusIssues.length} equipment
                      </div>
                    </div>
                  </div>
                  {qualityIssues.focusIssues.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#856404" }}>
                      {qualityIssues.focusIssues.map((eq) => eq.designation).join(", ")}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    backgroundColor: qualityIssues.partialOcclusion.length > 0 ? "#fff3cd" : "#f8f9fa",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>🚧</span>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>Partial Occlusion</div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        {qualityIssues.partialOcclusion.length} equipment
                      </div>
                    </div>
                  </div>
                  {qualityIssues.partialOcclusion.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#856404" }}>
                      {qualityIssues.partialOcclusion.map((eq) => eq.designation).join(", ")}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    backgroundColor: qualityIssues.weatheringDamage.length > 0 ? "#fff3cd" : "#f8f9fa",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>Weathering Damage</div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        {qualityIssues.weatheringDamage.length} equipment
                      </div>
                    </div>
                  </div>
                  {qualityIssues.weatheringDamage.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#856404" }}>
                      {qualityIssues.weatheringDamage.map((eq) => eq.designation).join(", ")}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    backgroundColor: qualityIssues.poorReadability.length > 0 ? "#f8d7da" : "#f8f9fa",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>❌</span>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>Poor Readability</div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        {qualityIssues.poorReadability.length} equipment
                      </div>
                    </div>
                  </div>
                  {qualityIssues.poorReadability.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#721c24" }}>
                      {qualityIssues.poorReadability.map((eq) => eq.designation).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Missing Fields Section */}
        <div className="report-section" style={{ marginBottom: "30px" }}>
          <div
            className="section-header"
            onClick={() => toggleSection("missing")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
              Missing Fields Analysis ({missingFieldsAnalysis.length})
            </h2>
            <span style={{ fontSize: "18px" }}>{expandedSections.missing ? "▼" : "▶"}</span>
          </div>

          {expandedSections.missing && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #dee2e6",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "white",
              }}
            >
              {missingFieldsAnalysis.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>✓</div>
                  <div>No missing fields detected. All equipment data is complete!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {missingFieldsAnalysis.map((item) => (
                    <div
                      key={item.equipmentId}
                      style={{
                        padding: "15px",
                        border: "1px solid #ffc107",
                        borderRadius: "6px",
                        backgroundColor: "#fff3cd",
                      }}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                        {item.designation} ({item.type})
                      </div>
                      <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                        <strong>Missing Fields:</strong> {item.missingFields.join(", ")}
                      </div>
                      {item.recommendations.length > 0 && (
                        <div style={{ fontSize: "13px", color: "#856404" }}>
                          <strong>Recommendations:</strong>
                          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                            {item.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommended Actions Section */}
        <div className="report-section" style={{ marginBottom: "30px" }}>
          <div
            className="section-header"
            onClick={() => toggleSection("actions")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
              Recommended Actions ({recommendedActions.length})
            </h2>
            <span style={{ fontSize: "18px" }}>{expandedSections.actions ? "▼" : "▶"}</span>
          </div>

          {expandedSections.actions && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #dee2e6",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "white",
              }}
            >
              {recommendedActions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
                  <div>No actions required. All equipment data is in excellent condition!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {recommendedActions.map((action, index) => {
                    const priorityColors = {
                      high: { bg: "#f8d7da", border: "#dc3545", text: "#721c24" },
                      medium: { bg: "#fff3cd", border: "#ffc107", text: "#856404" },
                      low: { bg: "#d1ecf1", border: "#17a2b8", text: "#0c5460" },
                    };
                    const colors = priorityColors[action.priority];

                    return (
                      <div
                        key={index}
                        style={{
                          padding: "15px",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "6px",
                          backgroundColor: colors.bg,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              backgroundColor: colors.border,
                              color: "white",
                            }}
                          >
                            {action.priority}
                          </span>
                          <strong style={{ color: colors.text }}>{action.action}</strong>
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "12px",
                              color: colors.text,
                            }}
                          >
                            {action.count} item{action.count > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", color: colors.text }}>{action.details}</div>
                        {action.equipmentList && action.equipmentList.length > 0 && (
                          <div style={{ fontSize: "12px", marginTop: "8px", color: colors.text }}>
                            <strong>Equipment:</strong> {action.equipmentList.map((eq) => eq.designation).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Export Options</h3>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <button
              onClick={exportToJSON}
              style={{
                padding: "12px 24px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              📥 Export to JSON
            </button>
            <button
              onClick={() => alert("PDF export coming soon!")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              📄 Export to PDF
            </button>
            <button
              onClick={() => alert("Excel export coming soon!")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              📊 Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Modal */}
      {selectedEquipment && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedEquipment(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              maxWidth: "1200px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "30px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>
                {selectedEquipment.userInputs?.designation || `${selectedEquipment.type} #${selectedEquipment.equipmentNumber}`}
              </h2>
              <button
                onClick={() => setSelectedEquipment(null)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
              {/* Left: Nameplate Image */}
              <div>
                <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Nameplate Image</h3>
                {selectedEquipment.nameplateImages && selectedEquipment.nameplateImages.length > 0 ? (
                  <img
                    src={selectedEquipment.nameplateImages[0]}
                    alt="Nameplate"
                    style={{ width: "100%", borderRadius: "8px", border: "1px solid #dee2e6" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "300px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6c757d",
                    }}
                  >
                    No image available
                  </div>
                )}
              </div>

              {/* Right: Extracted Data */}
              <div>
                <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Extracted Data</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(selectedEquipment.aiExtractedData?.basicInfo || {}).map(([key, value]) => {
                    const confidence = selectedEquipment.aiExtractedData?.confidenceScores?.[key] || 0;
                    return (
                      <div
                        key={key}
                        style={{
                          padding: "10px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", color: "#6c757d", textTransform: "capitalize" }}>
                            {key}
                          </div>
                          <div style={{ fontWeight: "500", marginTop: "3px" }}>{value || "N/A"}</div>
                        </div>
                        {confidence > 0 && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              backgroundColor: `${getConfidenceColor(confidence)}20`,
                              color: getConfidenceColor(confidence),
                            }}
                          >
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {Object.entries(selectedEquipment.aiExtractedData?.electrical || {}).map(([key, value]) => {
                    const confidence = selectedEquipment.aiExtractedData?.confidenceScores?.[key] || 0;
                    return (
                      <div
                        key={key}
                        style={{
                          padding: "10px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", color: "#6c757d", textTransform: "capitalize" }}>
                            {key}
                          </div>
                          <div style={{ fontWeight: "500", marginTop: "3px" }}>{value || "N/A"}</div>
                        </div>
                        {confidence > 0 && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              backgroundColor: `${getConfidenceColor(confidence)}20`,
                              color: getConfidenceColor(confidence),
                            }}
                          >
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Extraction Quality */}
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Extraction Quality</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px" }}>
                    <div>
                      Readability:{" "}
                      <strong>
                        {selectedEquipment.aiExtractedData?.extractionQuality?.nameplateReadability || "N/A"}
                      </strong>
                    </div>
                    <div>
                      Glare: {selectedEquipment.aiExtractedData?.extractionQuality?.glarePresent ? "⚠️ Yes" : "✓ No"}
                    </div>
                    <div>
                      Focus Issues:{" "}
                      {selectedEquipment.aiExtractedData?.extractionQuality?.focusIssues ? "⚠️ Yes" : "✓ No"}
                    </div>
                    <div>
                      Occlusion:{" "}
                      {selectedEquipment.aiExtractedData?.extractionQuality?.partialOcclusion ? "⚠️ Yes" : "✓ No"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingReportView;
