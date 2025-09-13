import { createProjectTool, updateProjectTool, getProjectDetailsTool, listProjectsTool } from "./project-tools"

export const getProjectTools = (userId: string) => ({
  createProject: createProjectTool(userId),
  updateProject: updateProjectTool(userId),
  getProjectDetails: getProjectDetailsTool(userId),
  listProjects: listProjectsTool(userId),
})

export const getAllTools = (userId: string) => ({
  ...getProjectTools(userId),
})