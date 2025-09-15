import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get project with template information
    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        project_templates (
          id,
          name,
          category,
          default_rooms
        )
      `)
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (err: unknown) {
    console.error("Error in project details endpoint:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { roomDetails, projectSpecifics } = await request.json()

    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First, get the current project to merge with existing data
    const { data: currentProject, error: fetchError } = await supabase
      .from("projects")
      .select("project_details")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single()

    if (fetchError || !currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Merge room details with existing project_details data
    let updatedRooms: any[] = Array.isArray(currentProject.project_details) ? currentProject.project_details : []
    
    if (roomDetails) {
      // For each room in roomDetails, update or add to the existing rooms
      Object.entries(roomDetails).forEach(([roomName, details]) => {
        const existingRoomIndex = updatedRooms.findIndex(
          (room: any) => room.name === roomName
        )
        
        if (existingRoomIndex >= 0) {
          // Update existing room
          const existingRoom = updatedRooms[existingRoomIndex]
          updatedRooms[existingRoomIndex] = {
            ...existingRoom,
            details: {
              ...(existingRoom.details || {}),
              ...details
            }
          }
        } else {
          // Add new room
          updatedRooms.push({
            name: roomName,
            details: details
          })
        }
      })
    }

    // Build update object
    const updateData: Record<string, any> = {
      project_details: updatedRooms,
      updated_at: new Date().toISOString()
    }

    // Add any project-specific fields
    if (projectSpecifics) {
      Object.entries(projectSpecifics).forEach(([key, value]) => {
        updateData[key] = value
      })
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("Error updating project details:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}

// PATCH endpoint for incremental updates (useful for AI tools)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const updates = await request.json()

    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current project data
    const { data: currentProject, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single()

    if (fetchError || !currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Deep merge logic for project_details data
    let updatedRooms: any[] = Array.isArray(currentProject.project_details) ? currentProject.project_details : []
    if (updates.project_details) {
      updates.project_details.forEach((updateRoom: any) => {
        const existingIndex = updatedRooms.findIndex(
          (room: any) => room.name === updateRoom.name
        )
        
        if (existingIndex >= 0) {
          // Deep merge existing room details
          updatedRooms[existingIndex] = {
            ...updatedRooms[existingIndex],
            details: {
              ...updatedRooms[existingIndex].details,
              ...updateRoom.details
            }
          }
        } else {
          updatedRooms.push(updateRoom)
        }
      })
      updates.project_details = updatedRooms
    }

    // Add timestamp
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("Error patching project details:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}