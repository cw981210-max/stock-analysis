export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    format: 'openai',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    format: 'openai',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash (推荐)' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro (旗舰)' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat (兼容)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (兼容)' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    format: 'anthropic',
    models: [
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7 (旗舰)' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (推荐)' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (极速)' },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    format: 'openai',
    models: [
      { id: 'kimi-k2.6', name: 'Kimi K2.6 (最新)' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5 (推荐)' },
      { id: 'moonshot-v1-auto', name: 'Moonshot V1 Auto' },
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K' },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K' },
      { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K' },
    ],
  },
  {
    id: 'glm',
    name: 'GLM (智谱清言)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    format: 'openai',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus (旗舰)' },
      { id: 'glm-4-air-250414', name: 'GLM-4 Air (性价比)' },
      { id: 'glm-4-flashx-250414', name: 'GLM-4 FlashX (高速)' },
      { id: 'glm-4-flash-250414', name: 'GLM-4 Flash (免费)' },
      { id: 'glm-4-long', name: 'GLM-4 Long (长文本)' },
      { id: 'glm-z1-air', name: 'GLM-Z1 Air (推理)' },
      { id: 'glm-z1-airx', name: 'GLM-Z1 AirX (极速推理)' },
      { id: 'glm-z1-flashx', name: 'GLM-Z1 FlashX (高速推理)' },
      { id: 'glm-z1-flash', name: 'GLM-Z1 Flash (免费推理)' },
    ],
  },
]

export function getProvider(providerId) {
  return PROVIDERS.find(p => p.id === providerId) || PROVIDERS[0]
}

export function getProviderModels(providerId) {
  return getProvider(providerId).models
}

const SYSTEM_PROMPT = '你是一位专业的A股投资分析师。请基于提供的数据进行客观、全面的投资分析。所有分析必须结合具体数据给出判断。请使用 Markdown 格式输出。'

export async function streamAnalysis(prompt, apiKey, providerId = 'openai', model = 'gpt-4o-mini', onChunk) {
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  const provider = getProvider(providerId)
  const isAnthropic = provider.format === 'anthropic'

  // 构建请求 URL 列表（自定义代理优先）
  const urls = []
  const customProxy = localStorage.getItem('stockai_proxy')
  if (customProxy) {
    const basePath = isAnthropic ? '/v1/messages' : '/v1/chat/completions'
    urls.push(customProxy + basePath)
  }
  urls.push(provider.baseUrl)

  // 构建请求头
  const headers = { 'Content-Type': 'application/json' }
  if (isAnthropic) {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  // 构建请求体
  let body
  if (isAnthropic) {
    body = {
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }
  } else {
    body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      stream: true,
      temperature: providerId === 'kimi' ? 1 : 0.7,
    }
  }

  let lastError = null

  for (const url of urls) {
    try {
      console.log('[StockAI] 请求API:', url, 'model:', model)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        if (response.status === 401) {
          throw new Error('API Key 无效或已过期，请检查设置中的 API Key')
        }
        if (response.status === 429) {
          throw new Error('API 调用频率超限，请稍后重试')
        }
        throw new Error(`API 请求失败 (${response.status}): ${errText.slice(0, 200)}`)
      }

      // 成功连接，开始流式读取
      console.log('[StockAI] API连接成功，开始读取流')
      return isAnthropic
        ? await readAnthropicStream(response, onChunk)
        : await readStream(response, onChunk)

    } catch (e) {
      lastError = e
      // 如果是 CORS 错误（TypeError: Failed to fetch），继续尝试下一个 URL
      if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
        continue
      }
      // 其他错误（401, 429 等）直接抛出
      throw e
    }
  }

  // 所有 URL 都试过了
  if (lastError?.message?.includes('Failed to fetch')) {
    throw new Error(
      '无法连接 AI 服务，可能是浏览器跨域限制(CORS)。\n' +
      '解决方案：\n' +
      '1. 在设置中配置代理地址（如你的自建代理）\n' +
      '2. 或使用浏览器 CORS 插件（如 CORS Unblock）\n' +
      '3. 或将项目部署到与 API 同域的服务器'
    )
  }
  throw lastError
}

async function readAnthropicStream(response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      try {
        const json = JSON.parse(payload)
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          fullText += json.delta.text
          onChunk(fullText)
        }
      } catch { /* skip */ }
    }
  }

  return fullText
}

async function readStream(response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let reasoningText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') break
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta
        if (!delta) continue

        // 推理/思考内容 (Kimi K2.x, DeepSeek Reasoner 等)
        if (delta.reasoning_content) {
          reasoningText += delta.reasoning_content
          // 实时展示思考过程
          const thinkingBlock = `> **思考中...**\n> ${reasoningText.slice(-200)}...\n\n`
          onChunk(fullText || thinkingBlock)
        }

        // 正式输出内容
        if (delta.content) {
          fullText += delta.content
          onChunk(fullText)
        }
      } catch { /* skip */ }
    }
  }

  // 如果只有推理没有正式输出，把推理内容作为最终结果
  if (!fullText && reasoningText) {
    fullText = `### 分析思考过程\n\n${reasoningText}`
    onChunk(fullText)
  }

  return fullText
}
