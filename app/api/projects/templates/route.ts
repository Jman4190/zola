import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .order("category", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group templates by category for easier frontend consumption
    const groupedTemplates = data.reduce((acc: Record<string, any[]>, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {})

    return NextResponse.json({
      templates: data,
      grouped: groupedTemplates
    })
  } catch (err: unknown) {
    console.error("Error in project templates endpoint:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}