// frontend/src/components/ReportGenerator.js - Enhanced for Live Preview
import React from "react";

const ReportGenerator = ({ project, squareFootage, isLivePreview = false }) => {
  if (!project || !project.rtus || project.rtus.length === 0) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <h3>No RTUs to Report</h3>
        <p>Capture RTU nameplates to generate the report.</p>
      </div>
    );
  }

  const rtus = project.rtus;
  const rtuCount = rtus.length;

  // Helper to safely extract data from nested structure
  const extractRTUData = (rtu) => {
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

  // Generate RTU descriptions
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

        return `The ${ordinal} unit is ${
          tonnage.match(/\d/) ? "an" : "a"
        } ${tonnage} model manufactured by ${manufacturer} in ${year}.`;
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

  const mechanicalSystemsReport = `The proposed space is served by ${numberToWord(
    rtuCount
  )} single packaged gas-fired roof top unit${
    rtuCount > 1 ? "s" : ""
  }. ${generateRTUDescriptions()} ${generateReplacementText()}${
    squareFootage
      ? ` With the proposed space being approximately ${parseFloat(
          squareFootage
        ).toLocaleString()}sq.ft., Schnackel Engineers estimates ${coolingEstimate}-tons of cooling will be required, however complete heat gain/loss calculations will be performed to determine the exact amount of cooling required.`
      : ""
  } The majority of ductwork in the space is interior insulated rectangular sheet metal ductwork with insulated flexible diffuser connections.`;

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

      {/* Mechanical Systems - THE MAIN CONTENT */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "15px",
            textDecoration: "underline",
          }}
        >
          Mechanical Systems:
        </h3>
        <p
          style={{
            textAlign: "justify",
            lineHeight: "1.6",
            fontSize: "14px",
          }}
        >
          {mechanicalSystemsReport}
        </p>
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
            </tr>
          </thead>
          <tbody>
            {rtus.map((rtu, index) => {
              const rtuData = extractRTUData(rtu);
              return (
                <tr key={rtu.id}>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    #{rtu.number}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {rtuData.manufacturer}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {rtuData.model}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {rtuData.tonnage}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {rtuData.year}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {rtuData.age} years
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
                colSpan="3"
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

export default ReportGenerator;
