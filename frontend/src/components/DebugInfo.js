import React from "react";

const DebugInfo = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "black",
        color: "white",
        padding: "10px",
        fontSize: "12px",
        zIndex: 10000,
        borderRadius: "4px",
        maxWidth: "300px",
        wordBreak: "break-all",
      }}
    >
      <h4>Debug Info:</h4>
      <p>
        <strong>API URL:</strong> {process.env.REACT_APP_API_URL || "NOT SET"}
      </p>
    </div>
  );
};

export default DebugInfo;
