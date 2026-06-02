const STORAGE_KEY = "mep-survey-projects";

export const sortProjects = (projects) =>
  [...projects].sort(
    (a, b) =>
      new Date(b.lastModified || b.createdAt) -
      new Date(a.lastModified || a.createdAt)
  );

export const readProjects = () => {
  try {
    const savedProjects = localStorage.getItem(STORAGE_KEY);
    return savedProjects ? JSON.parse(savedProjects) : [];
  } catch (error) {
    console.error("Could not read saved projects:", error);
    return [];
  }
};

export const writeProjects = (projects) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const listProjects = () => sortProjects(readProjects());

export const getProjectById = (projectId) =>
  readProjects().find((project) => project.id === projectId) || null;

export const createProjectRecord = (projectFields) => ({
  id: `project-${Date.now()}`,
  ...projectFields,
  rtus: [],
  electricalPanels: [],
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
});

export const addProject = (project) => {
  const projects = readProjects();
  const updatedProjects = [...projects, project];
  writeProjects(updatedProjects);
  return sortProjects(updatedProjects);
};

export const deleteProjectById = (projectId) => {
  const updatedProjects = readProjects().filter(
    (project) => project.id !== projectId
  );
  writeProjects(updatedProjects);
  return sortProjects(updatedProjects);
};

export const updateProject = (projectId, updater) => {
  const projects = readProjects();
  const projectIndex = projects.findIndex((project) => project.id === projectId);

  if (projectIndex === -1) {
    return null;
  }

  const updatedProject = {
    ...updater(projects[projectIndex]),
    lastModified: new Date().toISOString(),
  };
  const updatedProjects = [...projects];
  updatedProjects[projectIndex] = updatedProject;
  writeProjects(updatedProjects);

  return updatedProject;
};
