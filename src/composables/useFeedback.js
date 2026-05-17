import { ref } from 'vue'
import { streamAnalysis } from '../api/openai.js'

export function useFeedback() {
  const refining = ref(false)
  const error = ref(null)

  async function refineWithFeedback(originalReport, feedback, apiKey, providerId, model, onChunk) {
    refining.value = true
    error.value = null

    const prompt = `你是一位资深首席投资策略分析师。你之前为投资者提供了一份投资分析/建议，投资者看后给出了以下反馈意见。请根据反馈意见，对你的原始报告进行补充、修正和完善。

## 投资者的反馈意见
${feedback}

## 你的原始报告
${originalReport}

请根据反馈意见，给出完善后的报告。保留原始报告的核心框架，只修改和补充投资者关注的部分。如果投资者的反馈指出了错误或遗漏，请修正。如果反馈提出了新问题，请补充分析。`

    try {
      const result = await streamAnalysis(prompt, apiKey, providerId, model, onChunk)
      return result
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      refining.value = false
    }
  }

  return { refining, error, refineWithFeedback }
}
