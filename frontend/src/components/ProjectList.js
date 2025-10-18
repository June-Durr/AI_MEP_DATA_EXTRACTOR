// frontend/src/components/ProjectList.js - Fixed React Component
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReportGenerator from "./ReportGenerator";
import AddressAutocomplete from "./AddressAutocomplete";

const ProjectList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportProjectId = searchParams.get("report");

  const [projects, setProjects] = useState([]);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [showReportFor, setShowReportFor] = useState(null);

  const [newProject, setNewProject] = useState({
    name: "",
    projectNumber: "",
    address: "",
    clientName: "",
    squareFootage: "",
    surveyDate: new Date().toISOString().split("T")[0],
    surveyorName: "",
    spaceDescription: "",
  });

  useEffect(() => {
    loadProjects();
    if (reportProjectId) {
      const project = projects.find((p) => p.id === reportProjectId);
      if (project) {
        setShowReportFor(project);
      }
    }
  }, [reportProjectId]);

  const loadProjects = () => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects);
      setProjects(
        parsed.sort(
          (a, b) =>
            new Date(b.lastModified || b.createdAt) -
            new Date(a.lastModified || a.createdAt)
        )
      );
    }
  };

  const createProject = () => {
    if (!newProject.name || !newProject.projectNumber) {
      alert("Please fill in Project Name and Project Number");
      return;
    }

    const project = {
      id: `project-${Date.now()}`,
      ...newProject,
      rtus: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    const savedProjects = localStorage.getItem("mep-survey-projects");
    const existingProjects = savedProjects ? JSON.parse(savedProjects) : [];
    existingProjects.push(project);
    localStorage.setItem(
      "mep-survey-projects",
      JSON.stringify(existingProjects)
    );

    setProjects(existingProjects);
    setShowNewProjectForm(false);
    setNewProject({
      name: "",
      projectNumber: "",
      address: "",
      clientName: "",
      squareFootage: "",
      surveyDate: new Date().toISOString().split("T")[0],
      surveyorName: "",
      spaceDescription: "",
    });

    navigate(`/camera/${project.id}`);
  };

  const deleteProject = (projectId) => {
    if (window.confirm("Delete this project? This cannot be undone.")) {
      const savedProjects = localStorage.getItem("mep-survey-projects");
      if (savedProjects) {
        const existingProjects = JSON.parse(savedProjects);
        const filtered = existingProjects.filter((p) => p.id !== projectId);
        localStorage.setItem("mep-survey-projects", JSON.stringify(filtered));
        setProjects(filtered);
      }
    }
  };

  const continueProject = (projectId) => {
    navigate(`/camera/${projectId}`);
  };

  const viewReport = (project) => {
    setShowReportFor(project);
  };

  if (showReportFor) {
    return (
      <div className="container">
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <button
            onClick={() => setShowReportFor(null)}
            className="btn"
            style={{
              backgroundColor: "#6c757d",
              color: "white",
            }}
          >
            ← Back to Projects
          </button>
          <button
            onClick={() => continueProject(showReportFor.id)}
            className="btn btn-primary"
          >
            ➕ Add More RTUs
          </button>
        </div>
        <ReportGenerator
          project={showReportFor}
          squareFootage={showReportFor.squareFootage}
          isLivePreview={true}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 5px 0" }}>MEP Survey Projects</h1>
            <p style={{ margin: 0, color: "#666" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} •{" "}
              {projects.reduce((sum, p) => sum + (p.rtus?.length || 0), 0)} RTUs
              captured
            </p>
          </div>
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="btn btn-primary"
            style={{ padding: "12px 24px" }}
          >
            ➕ New Project
          </button>
        </div>
      </div>

      {showNewProjectForm && (
        <div
          className="card"
          style={{
            marginBottom: "20px",
            backgroundColor: "#f8f9fa",
            border: "2px solid #007bff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Create New Project</h2>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
              }}
            >
              Project Name: *
            </label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              placeholder="e.g., Downtown Office Building"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Project Number: *
            </label>
            <input
              type="text"
              value={newProject.projectNumber}
              onChange={(e) =>
                setNewProject({ ...newProject, projectNumber: e.target.value })
              }
              placeholder="e.g., 220688"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Address:
            </label>
            <AddressAutocomplete
              value={newProject.address}
              onChange={(value) =>
                setNewProject({ ...newProject, address: value })
              }
              placeholder="123 Main Street, Miami, FL"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Client Name:
            </label>
            <input
              type="text"
              value={newProject.clientName}
              onChange={(e) =>
                setNewProject({ ...newProject, clientName: e.target.value })
              }
              placeholder="Client Name"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Square Footage:
            </label>
            <input
              type="number"
              value={newProject.squareFootage}
              onChange={(e) =>
                setNewProject({ ...newProject, squareFootage: e.target.value })
              }
              placeholder="e.g., 5000"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Survey Date:
            </label>
            <input
              type="date"
              value={newProject.surveyDate}
              onChange={(e) =>
                setNewProject({ ...newProject, surveyDate: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Surveyor Name:
            </label>
            <input
              type="text"
              value={newProject.surveyorName}
              onChange={(e) =>
                setNewProject({ ...newProject, surveyorName: e.target.value })
              }
              placeholder="Your Name"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
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
              Space Description:
            </label>
            <select
              value={newProject.spaceDescription}
              onChange={(e) =>
                setNewProject({
                  ...newProject,
                  spaceDescription: e.target.value,
                })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select space type...</option>
              <option value="Single vacant space">Single vacant space</option>
              <option value="Multiple vacant spaces">
                Multiple vacant spaces
              </option>
              <option value="Single occupied space">
                Single occupied space
              </option>
              <option value="Multiple occupied spaces">
                Multiple occupied spaces
              </option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
            <button
              onClick={() => {
                setShowNewProjectForm(false);
                setNewProject({
                  name: "",
                  projectNumber: "",
                  address: "",
                  clientName: "",
                  squareFootage: "",
                  surveyDate: new Date().toISOString().split("T")[0],
                  surveyorName: "",
                  spaceDescription: "",
                });
              }}
              className="btn"
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                padding: "12px 24px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={createProject}
              className="btn btn-success"
              style={{ flex: 1, padding: "12px 24px" }}
            >
              Create Project & Start Survey
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showNewProjectForm && (
        <div
          className="card"
          style={{ textAlign: "center", padding: "60px 20px" }}
        >
          <h2 style={{ color: "#666" }}>No Projects Yet</h2>
          <p style={{ color: "#999", marginBottom: "30px" }}>
            Create your first MEP survey project to get started
          </p>
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="btn btn-primary"
            style={{ padding: "15px 30px", fontSize: "18px" }}
          >
            ➕ Create First Project
          </button>
        </div>
      )}

      <div className="grid grid-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card"
            style={{
              border: "1px solid #ddd",
              transition: "box-shadow 0.3s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "15px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 5px 0", color: "#007bff" }}>
                  {project.name}
                </h3>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                  Project #{project.projectNumber}
                </p>
              </div>
              <div
                style={{
                  backgroundColor:
                    project.rtus?.length > 0 ? "#28a745" : "#ffc107",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {project.rtus?.length || 0} RTUs
              </div>
            </div>

            {project.address && (
              <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
                📍 {project.address}
              </p>
            )}

            {project.squareFootage && (
              <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
                📐 {parseFloat(project.squareFootage).toLocaleString()} sq.ft.
              </p>
            )}

            <p style={{ margin: "10px 0", fontSize: "14px", color: "#999" }}>
              Last updated:{" "}
              {new Date(
                project.lastModified || project.createdAt
              ).toLocaleDateString()}
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
                paddingTop: "15px",
                borderTop: "1px solid #eee",
              }}
            >
              <button
                onClick={() => continueProject(project.id)}
                className="btn btn-primary"
                style={{ flex: 1, padding: "10px" }}
              >
                📸{" "}
                {project.rtus?.length > 0 ? "Continue Survey" : "Start Survey"}
              </button>
              {project.rtus?.length > 0 && (
                <button
                  onClick={() => viewReport(project)}
                  className="btn btn-success"
                  style={{ flex: 1, padding: "10px" }}
                >
                  📄 View Report
                </button>
              )}
              <button
                onClick={() => deleteProject(project.id)}
                className="btn"
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  padding: "10px 15px",
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
