import { createClient } from "@/lib/supabase/server"
import { getEffectiveApiKey } from "@/lib/user-keys"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { provider, userId } = await request.json()

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = await getEffectiveApiKey(userId, provider)

    const envKeyMap = {
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    } as const

    return NextResponse.json({
      hasUserKey:
        !!apiKey && apiKey !== envKeyMap[provider as keyof typeof envKeyMap],
      provider,
    })
  } catch (error) {
    console.error("Error checking provider keys:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
