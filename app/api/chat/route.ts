import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK, streamText } from "ai"
import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse, extractErrorMessage } from "./utils"
import { getAllTools } from "./tools"

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
  message_group_id?: string
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      message_group_id,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (supabase) {
      await incrementMessageCount({ supabase, userId })
    }

    const userMessage = messages[messages.length - 1]

    if (supabase && userMessage?.role === "user") {
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
        model,
        isAuthenticated,
        message_group_id,
      })
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    let effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

    let apiKey: string | undefined
    if (isAuthenticated && userId) {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      apiKey = (await getEffectiveApiKey(userId, provider)) || undefined
    }

    // If it's the user's first turn and we can check projects, bias the model toward creation mode when none exist
    const isFirstUserTurn = messages.filter((m) => m.role === "user").length === 1
    let hasAnyProject: boolean | null = null
    if (supabase && isFirstUserTurn) {
      try {
        const { data: anyProject } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
        hasAnyProject = !!(anyProject && anyProject.length > 0)
        console.log("🧭 First turn project check:", { userId, chatId, model, hasAnyProject })
        if (!hasAnyProject) {
          effectiveSystemPrompt += `\n\n[Context] The user has zero projects in the database. Enter Project Creation Mode immediately. Do not call listProjects again in this message.`
        } else {
          effectiveSystemPrompt += `\n\n[Context] The user already has at least one project. You may ask which project they want to work on or proceed to get details. Avoid calling listProjects more than once.`
        }
      } catch (_) {
        // Non-fatal; proceed without injection
      }
    }

    // Get tools with userId context and optionally disable redundant listProjects on first turn with zero projects
    const tools = getAllTools(userId)
    const toolsForThisTurn = { ...tools } as Record<string, any>
    if (isFirstUserTurn && hasAnyProject === false) {
      delete (toolsForThisTurn as any).listProjects
      console.log("🛑 Disabled listProjects tool for this turn (zero projects)")
    }
    console.log("🧰 Tools enabled this turn:", Object.keys(toolsForThisTurn))

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: effectiveSystemPrompt,
      messages: messages,
      tools: toolsForThisTurn,
      toolChoice: "auto",
      maxSteps: isFirstUserTurn ? 3 : 10,
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
        // Don't set streamError anymore - let the AI SDK handle it through the stream
      },

      onStepFinish: (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log('🔧 Tool calls executed:', step.toolCalls.map(call => ({
            toolName: call.toolName,
            args: call.args
          })))
        }
        if (step.toolResults && step.toolResults.length > 0) {
          console.log('🔧 Tool results:', step.toolResults.map(result => ({
            toolCallId: result.toolCallId,
            result: result.result
          })))
        }
      },

      onFinish: async ({ response }) => {
        if (supabase) {
          await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as unknown as import("@/app/types/api.types").Message[],
            message_group_id,
            model,
          })
        }
      },
    })

    return result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
      getErrorMessage: (error: unknown) => {
        console.error("Error forwarded to client:", error)
        return extractErrorMessage(error)
      },
    })
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
