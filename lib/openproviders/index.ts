import { createGoogleGenerativeAI, google } from "@ai-sdk/google"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import { getProviderForModel } from "./provider-map"
import type { GeminiModel, OpenAIModel, SupportedModel } from "./types"

type OpenAIChatSettings = Parameters<typeof openai>[1]
type GoogleGenerativeAIProviderSettings = Parameters<typeof google>[1]

type ModelSettings<T extends SupportedModel> = T extends OpenAIModel
  ? OpenAIChatSettings
  : T extends GeminiModel
    ? GoogleGenerativeAIProviderSettings
    : never

export type OpenProvidersOptions<T extends SupportedModel> = ModelSettings<T>

export function openproviders<T extends SupportedModel>(
  modelId: T,
  settings?: OpenProvidersOptions<T>,
  apiKey?: string
): LanguageModelV1 {
  const provider = getProviderForModel(modelId)

  if (provider === "openai") {
    if (apiKey) {
      const openaiProvider = createOpenAI({
        apiKey,
        compatibility: "strict",
      })
      return openaiProvider(
        modelId as OpenAIModel,
        settings as OpenAIChatSettings
      )
    }
    return openai(modelId as OpenAIModel, settings as OpenAIChatSettings)
  }

  if (provider === "google") {
    if (apiKey) {
      const googleProvider = createGoogleGenerativeAI({ apiKey })
      return googleProvider(
        modelId as GeminiModel,
        settings as GoogleGenerativeAIProviderSettings
      )
    }
    return google(
      modelId as GeminiModel,
      settings as GoogleGenerativeAIProviderSettings
    )
  }

  throw new Error(`Unsupported model: ${modelId}`)
}
