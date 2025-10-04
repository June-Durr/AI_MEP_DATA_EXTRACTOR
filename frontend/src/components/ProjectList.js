// frontend/src/components/ProjectList.js - With Report Integration
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReportGenerator from "./ReportGenerator";

const ProjectList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportProjectId = searchParams.get("report");

  const [projects, setProjects] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  const [newProject, setNewProject] = useState({
    name: "",
    projectNumber: "",
    clientName: "",
    address: "",
    surveyDate: new Date().toISOString().split("T")[0],
    squareFootage: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (reportProjectId) {
      const project = projects.find((p) => p.id === reportProjectId);
      if (project) {
        setViewingReport(project);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [reportProjectId, projects]);

  const loadProjects = () => {
    const savedProjects = localStorage.getItem("mep-survey-projects");
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    } else {
      const sampleProjects = [
        {
          id: "demo-1",
          name: "Bay Harbor Towers",
          projectNumber: "220688",
          clientName: "Bay Harbor Properties",
          address: "123 Harbor Dr, Miami, FL",
          surveyDate: "2025-09-07",
          squareFootage: "6007",
          status: "In Progress",
          archived: false,
          rtus: [],
        },
      ];
      setProjects(sampleProjects);
      localStorage.setItem(
        "mep-survey-projects",
        JSON.stringify(sampleProjects)
      );
    }
  };

  const saveProjects = (updatedProjects) => {
    setProjects(updatedProjects);
    localStorage.setItem(
      "mep-survey-projects",
      JSON.stringify(updatedProjects)
    );
  };

  const createProject = () => {
    const project = {
      id: `project-${Date.now()}`,
      ...newProject,
      status: "Draft",
      archived: false,
      rtus: [],
      createdAt: new Date().toISOString(),
    };

    const updatedProjects = [project, ...projects];
    saveProjects(updatedProjects);

    setNewProject({
      name: "",
      projectNumber: "",
      clientName: "",
      address: "",
      surveyDate: new Date().toISOString().split("T")[0],
      squareFootage: "",
    });
    setShowNewProject(false);
  };

  const archiveProject = (projectId) => {
    if (window.confirm("Archive this project?")) {
      const updatedProjects = projects.map((project) =>
        project.id === projectId
          ? { ...project, archived: true, status: "Archived" }
          : project
      );
      saveProjects(updatedProjects);
    }
  };

  const deleteProject = (projectId) => {
    if (
      window.confirm("Permanently delete this project? This cannot be undone.")
    ) {
      const updatedProjects = projects.filter(
        (project) => project.id !== projectId
      );
      saveProjects(updatedProjects);
    }
  };

  const restoreProject = (projectId) => {
    const updatedProjects = projects.map((project) =>
      project.id === projectId
        ? { ...project, archived: false, status: "In Progress" }
        : project
    );
    saveProjects(updatedProjects);
  };

  const getProjectStats = (project) => {
    const rtuCount = project.rtus?.length || 0;
    return { rtuCount };
  };

  // If viewing a report, show only the report
  if (viewingReport) {
    return (
      <div className="container">
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setViewingReport(null)}
            className="btn"
            style={{ padding: "10px 20px" }}
          >
            ← Back to Projects
          </button>
        </div>
        <ReportGenerator
          project={viewingReport}
          squareFootage={viewingReport.squareFootage}
        />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);
  const displayProjects = showArchived ? archivedProjects : activeProjects;

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ marginBottom: "30px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 10px 0", color: "#333" }}>
              MEP Survey Projects
            </h1>
            <p style={{ margin: 0, color: "#666" }}>
              Manage field surveys and generate reports
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="btn"
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                backgroundColor: showArchived ? "#6c757d" : "white",
                color: showArchived ? "white" : "#666",
                border: "1px solid #ddd",
              }}
            >
              {showArchived ? "📋 Show Active" : "📁 Show Archived"}
            </button>

            <button
              onClick={() => setShowNewProject(true)}
              className="btn btn-primary"
              style={{ fontSize: "14px", padding: "10px 20px" }}
            >
              ➕ New Project
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-2" style={{ gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#e3f2fd",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ color: "#1976d2", margin: "0 0 10px 0" }}>
              Active Projects
            </h3>
            <p
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#1976d2",
                margin: 0,
              }}
            >
              {activeProjects.length}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#e8f5e8",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ color: "#388e3c", margin: "0 0 10px 0" }}>
              Total RTUs
            </h3>
            <p
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#388e3c",
                margin: 0,
              }}
            >
              {activeProjects.reduce(
                (sum, p) => sum + (p.rtus?.length || 0),
                0
              )}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#fff3e0",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ color: "#f57c00", margin: "0 0 10px 0" }}>Archived</h3>
            <p
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#f57c00",
                margin: 0,
              }}
            >
              {archivedProjects.length}
            </p>
          </div>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProject && (
        <div className="card" style={{ marginBottom: "30px" }}>
          <h2 style={{ margin: "0 0 20px 0" }}>Create New Project</h2>

          <div className="grid grid-2" style={{ gap: "20px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Project Name *
              </label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., Shell Bay Resort"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Project Number *
              </label>
              <input
                type="text"
                value={newProject.projectNumber}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    projectNumber: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., 220433"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Client Name
              </label>
              <input
                type="text"
                value={newProject.clientName}
                onChange={(e) =>
                  setNewProject({ ...newProject, clientName: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
                placeholder="Client company name"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Survey Date
              </label>
              <input
                type="date"
                value={newProject.surveyDate}
                onChange={(e) =>
                  setNewProject({ ...newProject, surveyDate: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Square Footage
              </label>
              <input
                type="number"
                value={newProject.squareFootage}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    squareFootage: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., 6007"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "5px",
                }}
              >
                Site Address
              </label>
              <input
                type="text"
                value={newProject.address}
                onChange={(e) =>
                  setNewProject({ ...newProject, address: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
            <button
              onClick={() => setShowNewProject(false)}
              className="btn"
              style={{
                padding: "10px 20px",
                color: "#666",
                backgroundColor: "white",
                border: "1px solid #ddd",
              }}
            >
              Cancel
            </button>
            <button
              onClick={createProject}
              disabled={!newProject.name || !newProject.projectNumber}
              className="btn btn-primary"
              style={{
                padding: "10px 20px",
                opacity:
                  !newProject.name || !newProject.projectNumber ? 0.6 : 1,
              }}
            >
              Create Project
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div>
        {displayProjects.length === 0 ? (
          <div className="card text-center" style={{ padding: "60px 20px" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>
              {showArchived ? "📁" : "📋"}
            </div>
            <h3 style={{ color: "#333", marginBottom: "10px" }}>
              {showArchived ? "No Archived Projects" : "No Active Projects"}
            </h3>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              {showArchived
                ? "Archived projects will appear here."
                : "Create your first MEP survey project to get started."}
            </p>
            {!showArchived && (
              <button
                onClick={() => setShowNewProject(true)}
                className="btn btn-primary"
                style={{ padding: "12px 30px" }}
              >
                Create First Project
              </button>
            )}
          </div>
        ) : (
          displayProjects.map((project) => {
            const stats = getProjectStats(project);

            return (
              <div
                key={project.id}
                className="card"
                style={{
                  marginBottom: "20px",
                  opacity: project.archived ? 0.8 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        marginBottom: "10px",
                      }}
                    >
                      <h3 style={{ color: "#333", margin: 0 }}>
                        {project.name}
                      </h3>
                      <span
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          borderRadius: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            project.status === "Completed"
                              ? "#d4edda"
                              : project.status === "Archived"
                              ? "#f8f9fa"
                              : "#cce5ff",
                          color:
                            project.status === "Completed"
                              ? "#155724"
                              : project.status === "Archived"
                              ? "#6c757d"
                              : "#004085",
                        }}
                      >
                        {project.status}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        lineHeight: "1.5",
                      }}
                    >
                      <p style={{ margin: "5px 0" }}>
                        <strong>Project #:</strong> {project.projectNumber}
                      </p>
                      {project.clientName && (
                        <p style={{ margin: "5px 0" }}>
                          <strong>Client:</strong> {project.clientName}
                        </p>
                      )}
                      {project.address && (
                        <p style={{ margin: "5px 0" }}>
                          <strong>Address:</strong> {project.address}
                        </p>
                      )}
                      <p style={{ margin: "5px 0" }}>
                        <strong>Survey Date:</strong>{" "}
                        {new Date(project.surveyDate).toLocaleDateString()}
                      </p>
                      {project.squareFootage && (
                        <p style={{ margin: "5px 0" }}>
                          <strong>Area:</strong>{" "}
                          {parseFloat(project.squareFootage).toLocaleString()}{" "}
                          sq.ft.
                        </p>
                      )}
                      <p style={{ margin: "5px 0" }}>
                        <strong>RTUs Captured:</strong> {stats.rtuCount}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginLeft: "20px",
                    }}
                  >
                    {!project.archived ? (
                      <>
                        <Link
                          to={`/camera/${project.id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <button
                            className="btn btn-primary"
                            style={{
                              fontSize: "14px",
                              padding: "8px 16px",
                              width: "160px",
                            }}
                          >
                            📸{" "}
                            {stats.rtuCount > 0
                              ? `Add RTU #${stats.rtuCount + 1}`
                              : "Start Survey"}
                          </button>
                        </Link>

                        {stats.rtuCount > 0 && (
                          <button
                            onClick={() => setViewingReport(project)}
                            className="btn btn-success"
                            style={{
                              fontSize: "14px",
                              padding: "8px 16px",
                              width: "160px",
                            }}
                          >
                            📄 View Report
                          </button>
                        )}

                        <button
                          onClick={() => archiveProject(project.id)}
                          className="btn"
                          style={{
                            fontSize: "14px",
                            padding: "8px 16px",
                            width: "160px",
                            backgroundColor: "#ffc107",
                            color: "#856404",
                          }}
                        >
                          📁 Archive
                        </button>

                        <button
                          onClick={() => deleteProject(project.id)}
                          className="btn"
                          style={{
                            fontSize: "14px",
                            padding: "8px 16px",
                            width: "160px",
                            backgroundColor: "#dc3545",
                            color: "white",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => restoreProject(project.id)}
                          className="btn btn-success"
                          style={{
                            fontSize: "14px",
                            padding: "8px 16px",
                            width: "160px",
                          }}
                        >
                          🔄 Restore
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="btn"
                          style={{
                            fontSize: "14px",
                            padding: "8px 16px",
                            width: "160px",
                            backgroundColor: "#dc3545",
                            color: "white",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectList;
