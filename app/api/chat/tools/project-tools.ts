import { createClient } from "@/lib/supabase/server"
import { getRoomDetailsTemplate, validateProjectData } from "@/lib/project-schemas"
import { tool } from "ai"
import { z } from "zod"

// Create Project Tool - we'll inject userId via closure
export const createProjectTool = (userId: string) => tool({
  description: "Creates a new home remodeling project for the user. Use this when a user mentions starting a new renovation, remodel, or home improvement project.",
  parameters: z.object({
    name: z.string().describe("The name of the project (e.g., 'Kitchen Remodel', 'Master Bathroom Renovation')"),
    projectType: z.string().describe("The type of project: 'kitchen', 'bathroom', 'living_room', 'bedroom', 'whole_house', or 'outdoor'"),
    description: z.string().optional().describe("Optional description of the project"),
    location: z.string().optional().describe("Location/address of the project")
  }),
  execute: async ({ name, projectType, description, location }) => {
    console.log('🏠 Creating project:', { userId, name, projectType, description, location })
    
    try {
      const supabase = await createClient()
      
      if (!supabase) {
        return {
          success: false,
          error: "Database not available"
        }
      }

      // Validate data
      const validation = validateProjectData({
        name,
        description
      })

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        }
      }

      // Find the appropriate template
      const { data: templates } = await supabase
        .from("project_templates")
        .select("*")
        .eq("category", projectType)
        .limit(1)

      const template = templates?.[0]
      let initialRooms: any[] = []

      if (template?.default_rooms && Array.isArray(template.default_rooms)) {
        initialRooms = (template.default_rooms as string[]).map((roomName: string) => ({
          name: roomName,
          details: getRoomDetailsTemplate(projectType, roomName)
        }))
      }

      // Create the project
      const projectData = {
        name,
        user_id: userId,
        description: description || null,
        template_id: template?.id || null,
        location: location || null,
        project_details: initialRooms,
        status: 'planning' as const
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single()

      if (error) {
        console.error('❌ Project creation failed:', error)
        return {
          success: false,
          error: error.message
        }
      }

      console.log('✅ Project created successfully:', project.id)
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          type: projectType,
          status: project.status,
          project_details: initialRooms.map(a => a.name),
          template: template?.name
        },
        message: `Successfully created "${name}" project! I've set up the initial project structure based on a ${template?.name || 'general'} template. Let's start gathering information about your project details.`
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// Update Project Tool
export const updateProjectTool = (userId: string) => tool({
  description: "Updates project information based on user conversation. Use this to save project details as the user provides them.",
  parameters: z.object({
    projectId: z.string().describe("The ID of the project to update"),
    updates: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      status: z.enum(['planning', 'in_progress', 'completed', 'on_hold']).optional(),
      projectUpdates: z.array(z.object({
        areaName: z.string(),
        details: z.record(z.any()).describe("Area-specific details to update")
      })).optional().describe("Updates to specific project area details"),
      conversationUpdate: z.string().optional().describe("A bulleted update to record from this conversation")
    })
  }),
  execute: async ({ projectId, updates }) => {
    console.log('📝 Updating project:', { userId, projectId, updates })
    
    try {
      const supabase = await createClient()
      
      if (!supabase) {
        return {
          success: false,
          error: "Database not available"
        }
      }

      // Validate the project exists and belongs to user
      const { data: existingProject, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single()

      if (fetchError || !existingProject) {
        return {
          success: false,
          error: "Project not found"
        }
      }

      // Build the update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Handle basic project fields
      if (updates.name) updateData.name = updates.name
      if (updates.description) updateData.description = updates.description
      if (updates.location) updateData.location = updates.location
      if (updates.status) updateData.status = updates.status

      // Handle project area updates
      if (updates.projectUpdates && updates.projectUpdates.length > 0) {
        console.log('🏠 Processing project area updates:', updates.projectUpdates)
        const currentAreas: any[] = Array.isArray(existingProject.project_details) ? [...existingProject.project_details] : []
        console.log('🏠 Current areas before update:', currentAreas)
        
        updates.projectUpdates.forEach(({ areaName, details }) => {
          console.log(`🏠 Updating area "${areaName}" with details:`, details)
          const areaIndex = currentAreas.findIndex((area: any) => area.name === areaName)
          
          if (areaIndex >= 0) {
            // Update existing area
            console.log(`🏠 Found existing area "${areaName}" at index ${areaIndex}`)
            const oldDetails = currentAreas[areaIndex].details
            const newDetails = {
              ...oldDetails,
              ...details
            }
            console.log(`🏠 Area "${areaName}" details update:`, { oldDetails, newDetails })
            currentAreas[areaIndex] = {
              ...currentAreas[areaIndex],
              details: newDetails
            }
          } else {
            // Add new area
            console.log(`🏠 Adding new area "${areaName}"`)
            currentAreas.push({
              name: areaName,
              details: details
            })
          }
        })
        
        console.log('🏠 Final areas after update:', currentAreas)
        updateData.project_details = currentAreas
      }

      // Handle conversation updates
      if (updates.conversationUpdate) {
        const currentUpdates = Array.isArray((existingProject as any).conversation_updates) ? (existingProject as any).conversation_updates : []
        const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        const newUpdate = `• ${updates.conversationUpdate} (${timestamp})`
        updateData.conversation_updates = [...currentUpdates, newUpdate]
      }

      // Validate the update data
      const validation = validateProjectData(updateData)
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        }
      }

      // Update the project
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId)
        .eq("user_id", userId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Project update failed:', updateError)
        return {
          success: false,
          error: updateError.message
        }
      }

      console.log('✅ Project updated successfully:', projectId)
      return {
        success: true,
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          status: updatedProject.status,
          lastUpdated: updatedProject.updated_at
        },
        message: "Project information updated successfully!"
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// List Projects Tool
export const listProjectsTool = (userId: string) => tool({
  description: "Lists all existing projects for the user. Use this to see what projects are already created and avoid duplicates, or to reference existing projects in conversation.",
  parameters: z.object({}),
  execute: async () => {
    console.log('📋 Listing projects for user:', userId)
    
    try {
      const supabase = await createClient()
      
      if (!supabase) {
        return {
          success: false,
          error: "Database not available"
        }
      }

      // Get all projects for the user with template information
      const { data: projects, error } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          description,
          status,
          location,
          budget_min,
          budget_max,
          target_completion_date,
          project_details,
          created_at,
          updated_at,
          template_id
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error('❌ Failed to fetch projects:', error)
        return {
          success: false,
          error: error.message
        }
      }

      // Get template names for projects that have them
      const templateIds = projects?.map(p => p.template_id).filter((id): id is string => Boolean(id)) || []
      let templates: any[] = []
      
      if (templateIds.length > 0) {
        const { data: templateData } = await supabase
          .from("project_templates")
          .select("id, name, category")
          .in("id", templateIds)
        
        templates = templateData || []
      }

      // Process projects with completion and template info
      const projectList = projects?.map(project => {
        const template = templates.find(t => t.id === project.template_id)
        
        // Calculate basic completion
        let totalFields = 0
        let completedFields = 0
        
        const basicFields = ['name', 'description', 'location']
        basicFields.forEach(field => {
          totalFields++
          if (project[field as keyof typeof project] && project[field as keyof typeof project] !== 'unknown') {
            completedFields++
          }
        })
        
        // Count project detail areas
        const areas = Array.isArray(project.project_details) ? project.project_details : []
        areas.forEach((area: any) => {
          if (area.details) {
            Object.values(area.details).forEach(value => {
              totalFields++
              if (value && value !== 'unknown' && value !== '') {
                completedFields++
              }
            })
          }
        })
        
        const completion = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          location: project.location,
          budget: {
            min: project.budget_min,
            max: project.budget_max
          },
          targetDate: project.target_completion_date,
          rooms: rooms.map((r: any) => r.name),
          completion,
          template: template?.name,
          category: template?.category,
          created: project.created_at,
          updated: project.updated_at
        }
      }) || []

      console.log(`✅ Retrieved ${projectList.length} projects for user`)
      
      return {
        success: true,
        projects: projectList,
        message: projectList.length > 0 
          ? `Found ${projectList.length} existing project${projectList.length === 1 ? '' : 's'}: ${projectList.map(p => `"${p.name}" (${p.status}, ${p.completion}% complete)`).join(', ')}`
          : "No existing projects found. You can create a new project when the user mentions starting a renovation."
      }

    } catch (error) {
      console.error('❌ Error listing projects:', error)
      return {
        success: false,
        error: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// Get Project Details Tool
export const getProjectDetailsTool = (userId: string) => tool({
  description: "Retrieves current project details and completion status. Use this to check what information is known about a project.",
  parameters: z.object({
    projectId: z.string().describe("The ID of the project to retrieve")
  }),
  execute: async ({ projectId }) => {
    console.log('🔍 Getting project details:', { userId, projectId })
    
    try {
      const supabase = await createClient()
      
      if (!supabase) {
        return {
          success: false,
          error: "Database not available"
        }
      }

      // Get project with template information
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single()

      if (error || !project) {
        return {
          success: false,
          error: "Project not found"
        }
      }

      // Get template information separately
      let template = null
      if (project.template_id) {
        const { data: templateData } = await supabase
          .from("project_templates")
          .select("id, name, category, default_rooms")
          .eq("id", project.template_id)
          .single()
        
        template = templateData
      }

      // Calculate completion percentage
      let completionScore = 0
      let totalFields = 0

      // Check basic project fields
      const basicFields = ['name', 'description', 'location'] as const
      basicFields.forEach(field => {
        totalFields++
        if (project[field] && project[field] !== 'unknown') {
          completionScore++
        }
      })

      // Check project area details
      const areas = Array.isArray(project.project_details) ? project.project_details : []
      const areaInfo: any[] = []
      
      areas.forEach((area: any) => {
        const areaDetails = area.details || {}
        let areaCompleted = 0
        let areaTotal = 0
        const missingInfo: string[] = []

        Object.entries(areaDetails).forEach(([key, value]) => {
          areaTotal++
          totalFields++
          if (value && value !== 'unknown' && value !== '') {
            areaCompleted++
            completionScore++
          } else {
            missingInfo.push(key)
          }
        })

        areaInfo.push({
          name: area.name,
          completion: areaTotal > 0 ? Math.round((areaCompleted / areaTotal) * 100) : 0,
          missingInfo: missingInfo.slice(0, 5) // Limit to first 5 missing items
        })
      })

      const overallCompletion = totalFields > 0 ? Math.round((completionScore / totalFields) * 100) : 0

      console.log('✅ Project details retrieved:', { projectId, completion: overallCompletion })
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          location: project.location,
          budget: {
            min: project.budget_min,
            max: project.budget_max
          },
          timeline: {
            start: project.start_date,
            completion: project.target_completion_date
          },
          template: template?.name,
          category: template?.category,
          completion: overallCompletion,
          areas: areaInfo,
          createdAt: project.created_at,
          lastUpdated: project.updated_at
        },
        message: `Project "${project.name}" is ${overallCompletion}% complete. ${
          overallCompletion < 50 
            ? "We still need to gather more information to help you with your project." 
            : overallCompletion < 90 
              ? "Good progress! Let's fill in the remaining details."
              : "Great! Your project information is nearly complete."
        }`
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to get project details: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})