import React, { useState, useMemo, useCallback } from "react";
import "./GapDetectionPanel.css";

const GapDetectionPanel = ({ validationResults, equipment, onBack, onSave }) => {
  const [expandedIssues, setExpandedIssues] = useState({});

  const toggleIssue = (issueId) => {
    setExpandedIssues((prev) => ({
      ...prev,
      [issueId]: !prev[issueId],
    }));
  };

  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  const calculateCompletionPercentage = useCallback(() => {
    if (!equipment || equipment.length === 0) return 0;

    let totalFields = 0;
    let completedFields = 0;

    equipment.forEach((eq) => {
      const requiredUserFields = [
        "designation",
        "location",
        "wireSize.phase",
        "conduitSize",
      ];

      requiredUserFields.forEach((field) => {
        totalFields++;
        const fieldValue = getNestedValue(eq.userInputs, field);
        if (fieldValue && fieldValue !== "") {
          completedFields++;
        }
      });
    });

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }, [equipment]);

  const stats = useMemo(() => {
    return {
      totalErrors: validationResults?.errors?.length || 0,
      totalWarnings: validationResults?.warnings?.length || 0,
      totalInfo: validationResults?.info?.length || 0,
      totalEquipment: equipment?.length || 0,
      completionPercentage: calculateCompletionPercentage(),
    };
  }, [validationResults, equipment, calculateCompletionPercentage]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return "#dc3545";
      case "warning":
        return "#ffc107";
      case "info":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "•";
    }
  };

  const buildHierarchyTree = () => {
    if (!equipment || equipment.length === 0) return null;

    const rootEquipment = equipment.filter(
      (eq) => !eq.parentId || eq.hierarchyLevel === 0
    );

    const renderEquipmentNode = (eq, level = 0) => {
      const children = equipment.filter((child) => child.parentId === eq.id);
      const hasIssues =
        (validationResults?.errors || []).some((err) => err.equipmentId === eq.id) ||
        (validationResults?.warnings || []).some((warn) => warn.equipmentId === eq.id);

      return (
        <div key={eq.id} style={{ marginLeft: `${level * 30}px`, marginBottom: "10px" }}>
          <div
            style={{
              padding: "10px",
              backgroundColor: hasIssues ? "#fff3cd" : "#f8f9fa",
              border: `1px solid ${hasIssues ? "#ffc107" : "#dee2e6"}`,
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: "bold" }}>
                {eq.type === "transformer" && "🔌"}
                {eq.type === "service_disconnect" && "⚡"}
                {eq.type === "meter" && "📊"}
                {eq.type === "panel" && "⚙️"}
              </span>
              <span>
                <strong>{eq.userInputs?.designation || `${eq.type} #${eq.equipmentNumber || ""}`}</strong>
              </span>
              <span style={{ color: "#6c757d", fontSize: "12px" }}>
                {eq.aiExtractedData?.electrical?.voltage || "Unknown V"}
                {eq.aiExtractedData?.electrical?.busRating
                  ? ` | ${eq.aiExtractedData.electrical.busRating}`
                  : ""}
              </span>
              {hasIssues && (
                <span style={{ color: "#ffc107", fontSize: "12px" }}>⚠️ Has Issues</span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>
              {eq.userInputs?.location || "Location not specified"}
            </div>
          </div>
          {children.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              {children.map((child) => renderEquipmentNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div>
        {rootEquipment.map((eq) => renderEquipmentNode(eq, 0))}
        {rootEquipment.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: "#6c757d" }}>
            No root equipment found. Check electrical hierarchy relationships.
          </div>
        )}
      </div>
    );
  };

  const renderIssueCard = (issue, index, severity) => {
    const issueId = `${severity}-${index}`;
    const isExpanded = expandedIssues[issueId];

    return (
      <div
        key={issueId}
        style={{
          marginBottom: "10px",
          border: `1px solid ${getSeverityColor(severity)}`,
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 15px",
            backgroundColor: `${getSeverityColor(severity)}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
          onClick={() => toggleIssue(issueId)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            <span style={{ fontSize: "18px" }}>{getSeverityIcon(severity)}</span>
            <span style={{ fontWeight: "500", color: "#333" }}>{issue.message}</span>
          </div>
          <span style={{ fontSize: "12px", color: "#6c757d" }}>
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>

        {isExpanded && (
          <div style={{ padding: "15px", backgroundColor: "#fff" }}>
            {issue.equipmentId && (
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#6c757d" }}>
                  Equipment ID:
                </strong>
                <span style={{ fontSize: "12px", marginLeft: "5px" }}>
                  {issue.equipmentId}
                </span>
              </div>
            )}

            {issue.type && (
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#6c757d" }}>Issue Type:</strong>
                <span
                  style={{
                    fontSize: "12px",
                    marginLeft: "5px",
                    backgroundColor: "#e9ecef",
                    padding: "2px 8px",
                    borderRadius: "3px",
                  }}
                >
                  {issue.type}
                </span>
              </div>
            )}

            {issue.details && (
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#6c757d" }}>Details:</strong>
                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "5px",
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "3px",
                  }}
                >
                  {issue.details}
                </div>
              </div>
            )}

            {issue.suggestedAction && (
              <div style={{ marginTop: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#28a745" }}>
                  Suggested Action:
                </strong>
                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "5px",
                    padding: "10px",
                    backgroundColor: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "3px",
                    color: "#155724",
                  }}
                >
                  {issue.suggestedAction}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="gap-detection-panel" style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#333" }}>Validation & Gap Detection</h2>

      {/* Status Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <div
          className="status-badge"
          style={{
            padding: "15px",
            backgroundColor: stats.totalErrors > 0 ? "#f8d7da" : "#d4edda",
            border: `1px solid ${stats.totalErrors > 0 ? "#f5c6cb" : "#c3e6cb"}`,
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
            {stats.totalErrors}
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>Errors</div>
        </div>

        <div
          className="status-badge"
          style={{
            padding: "15px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>
            {stats.totalWarnings}
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>Warnings</div>
        </div>

        <div
          className="status-badge"
          style={{
            padding: "15px",
            backgroundColor: "#d1ecf1",
            border: "1px solid #bee5eb",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#17a2b8" }}>
            {stats.totalInfo}
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>Info</div>
        </div>

        <div
          className="status-badge"
          style={{
            padding: "15px",
            backgroundColor: "#e2e3e5",
            border: "1px solid #d6d8db",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#383d41" }}>
            {stats.completionPercentage}%
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>
            Data Complete
          </div>
        </div>
      </div>

      {/* Overall Status Message */}
      {stats.totalErrors > 0 && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#721c24",
          }}
        >
          <strong>⛔ Action Required:</strong> You must resolve {stats.totalErrors} error
          {stats.totalErrors > 1 ? "s" : ""} before saving the survey.
        </div>
      )}

      {stats.totalErrors === 0 && stats.totalWarnings === 0 && stats.totalInfo === 0 && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#155724",
          }}
        >
          <strong>✓ All Clear:</strong> No validation issues detected. You're ready to save the
          survey!
        </div>
      )}

      {/* Issues List */}
      {(stats.totalErrors > 0 || stats.totalWarnings > 0 || stats.totalInfo > 0) && (
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333", fontSize: "18px" }}>
            Issues Detected
          </h3>

          {/* Errors */}
          {stats.totalErrors > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  fontSize: "14px",
                  color: "#dc3545",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                }}
              >
                Errors ({stats.totalErrors})
              </h4>
              {validationResults.errors.map((error, index) =>
                renderIssueCard(error, index, "error")
              )}
            </div>
          )}

          {/* Warnings */}
          {stats.totalWarnings > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  fontSize: "14px",
                  color: "#ffc107",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                }}
              >
                Warnings ({stats.totalWarnings})
              </h4>
              {validationResults.warnings.map((warning, index) =>
                renderIssueCard(warning, index, "warning")
              )}
            </div>
          )}

          {/* Info */}
          {stats.totalInfo > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  fontSize: "14px",
                  color: "#17a2b8",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                }}
              >
                Information ({stats.totalInfo})
              </h4>
              {validationResults.info.map((info, index) =>
                renderIssueCard(info, index, "info")
              )}
            </div>
          )}
        </div>
      )}

      {/* Hierarchy Visualization */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ marginBottom: "15px", color: "#333", fontSize: "18px" }}>
          Electrical Hierarchy
        </h3>
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          {buildHierarchyTree()}
        </div>
      </div>

      {/* Equipment Summary */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ marginBottom: "15px", color: "#333", fontSize: "18px" }}>
          Equipment Summary
        </h3>
        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            padding: "15px",
          }}
        >
          <div style={{ fontSize: "14px", marginBottom: "10px" }}>
            <strong>Total Equipment:</strong> {stats.totalEquipment}
          </div>
          {equipment && equipment.length > 0 && (
            <div style={{ fontSize: "14px" }}>
              <strong>By Type:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                <li>
                  Transformers: {equipment.filter((eq) => eq.type === "transformer").length}
                </li>
                <li>
                  Service Disconnects:{" "}
                  {equipment.filter((eq) => eq.type === "service_disconnect").length}
                </li>
                <li>Meters: {equipment.filter((eq) => eq.type === "meter").length}</li>
                <li>Panels: {equipment.filter((eq) => eq.type === "panel").length}</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          justifyContent: "space-between",
          marginTop: "30px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          ← Back to Edit
        </button>

        <button
          onClick={onSave}
          disabled={stats.totalErrors > 0}
          style={{
            padding: "12px 24px",
            backgroundColor: stats.totalErrors > 0 ? "#e9ecef" : "#28a745",
            color: stats.totalErrors > 0 ? "#6c757d" : "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: stats.totalErrors > 0 ? "not-allowed" : "pointer",
          }}
        >
          {stats.totalErrors > 0 ? "Fix Errors Before Saving" : "Save Survey ✓"}
        </button>
      </div>
    </div>
  );
};

export default GapDetectionPanel;
