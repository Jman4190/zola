import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      })
    }

    const userId = authData.user.id

    const {
      name,
      description,
      template_id,
      location,
      budget,
      target_completion_date
    } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    // If template_id is provided, fetch the template to initialize rooms
    let initialRooms = []
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from("project_templates")
        .select("default_rooms")
        .eq("id", template_id)
        .single()

      if (!templateError && template?.default_rooms && Array.isArray(template.default_rooms)) {
        initialRooms = template.default_rooms as any[]
      }
    }

    const projectData = {
      name: name.trim(),
      user_id: userId,
      description: description || null,
      template_id: template_id || null,
      location: location || null,
      budget: budget || null,
      target_completion_date: target_completion_date || null,
      project_details: initialRooms,
      status: 'planning'
    }

    const { data, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("Error in projects endpoint:", err)

    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}

export async function GET() {
  const supabase = await createClient()

  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Supabase not available in this deployment." }),
      { status: 200 }
    )
  }

  const { data: authData } = await supabase.auth.getUser()

  const userId = authData?.user?.id
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
