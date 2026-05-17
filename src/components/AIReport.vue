<template>
  <section class="ai-report-section">
    <h2 class="section-title">
      <span class="title-icon">🤖</span>
      AI 投资分析报告
    </h2>

    <div class="report-container">
      <!-- Loading state -->
      <div v-if="analyzing && !htmlReport" class="loading-state">
        <div class="loading-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <p class="loading-text">正在分析...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button class="retry-btn" @click="$emit('retry')">
          <span class="retry-icon">🔄</span>
          重新分析
        </button>
      </div>

      <!-- Report content -->
      <div v-else-if="htmlReport" class="report-content">
        <!-- Rating badge -->
        <div v-if="extractedRating" class="rating-badge" :style="ratingBadgeStyle">
          {{ extractedRating }}
        </div>

        <div class="markdown-body" v-html="htmlReport"></div>

        <span v-if="analyzing" class="typing-cursor"></span>
      </div>

      <!-- Empty placeholder -->
      <div v-else class="empty-state">
        <span class="empty-icon">📋</span>
        <p>AI 分析报告将在数据加载后自动生成</p>
        <p class="empty-hint">请先在设置中配置 API Key</p>
      </div>
    </div>

    <!-- Feedback Section -->
    <div v-if="htmlReport && !analyzing" class="feedback-section">
      <div class="feedback-toggle" @click="showFeedback = !showFeedback">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{{ showFeedback ? '收起反馈' : '有意见？帮助AI完善分析' }}</span>
        <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showFeedback }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div v-if="showFeedback" class="feedback-form">
        <textarea
          v-model="feedbackText"
          placeholder="请输入您的意见或补充信息，如：希望增加xxx分析、某个数据有误、希望能更详细分析xxx方面..."
          class="feedback-input"
          rows="3"
        ></textarea>
        <button
          class="feedback-submit"
          :disabled="!feedbackText.trim() || refining"
          @click="$emit('feedback', feedbackText)"
        >
          <template v-if="refining">
            <span class="btn-loading-sm"></span>
            AI 正在优化...
          </template>
          <template v-else>提交反馈，优化报告</template>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getRatingColor, getRatingBgColor } from '../utils/format.js'

const props = defineProps({
  htmlReport: { type: String, default: '' },
  report: { type: String, default: '' },
  analyzing: { type: Boolean, default: false },
  error: { type: [String, null], default: null },
  refining: { type: Boolean, default: false },
})

defineEmits(['retry', 'feedback'])

const showFeedback = ref(false)
const feedbackText = ref('')

const RATING_KEYWORDS = ['强烈推荐', '建议买入', '持有观望', '建议减持', '回避']

const extractedRating = computed(() => {
  if (!props.report) return null
  const lines = props.report.split('\n')
  for (const line of lines) {
    if (line.includes('综合评级')) {
      for (const keyword of RATING_KEYWORDS) {
        if (line.includes(keyword)) return keyword
      }
    }
  }
  const ratingSection = props.report.split('综合评级')[1]
  if (ratingSection) {
    const firstFewLines = ratingSection.slice(0, 50)
    for (const keyword of RATING_KEYWORDS) {
      if (firstFewLines.includes(keyword)) return keyword
    }
  }
  return null
})

const ratingBadgeStyle = computed(() => {
  if (!extractedRating.value) return {}
  return {
    color: getRatingColor(extractedRating.value),
    backgroundColor: getRatingBgColor(extractedRating.value),
    borderColor: getRatingColor(extractedRating.value)
  }
})
</script>

<style scoped>
.ai-report-section {
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #c9d1d9;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon { font-size: 20px; }

.report-container { min-height: 200px; }

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
}

.loading-dots { display: flex; gap: 8px; }

.dot {
  width: 10px; height: 10px; border-radius: 50%;
  background-color: #58a6ff;
  animation: pulse-dot 1.4s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}

.loading-text { color: #8892b0; font-size: 15px; margin: 0; }

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 12px;
}
.error-icon { font-size: 32px; }
.error-message { color: #e94560; font-size: 14px; margin: 0; text-align: center; max-width: 400px; }

.retry-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px;
  background-color: rgba(233, 69, 96, 0.15);
  color: #e94560; border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 8px; font-size: 14px; cursor: pointer;
  transition: all 0.2s;
}
.retry-btn:hover { background-color: rgba(233, 69, 96, 0.25); border-color: #e94560; }
.retry-icon { font-size: 14px; }

.report-content { position: relative; }

.rating-badge {
  display: inline-block;
  padding: 6px 20px; border-radius: 20px;
  font-size: 15px; font-weight: 700;
  border: 1px solid; margin-bottom: 16px;
  letter-spacing: 1px;
}

.typing-cursor {
  display: inline-block; width: 2px; height: 1.1em;
  background-color: #58a6ff; margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink-cursor 1s step-end infinite;
}
@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 200px; color: #8892b0;
}
.empty-icon { font-size: 40px; margin-bottom: 8px; }
.empty-state p { margin: 0; font-size: 14px; }
.empty-hint { margin-top: 6px !important; font-size: 12px !important; color: #58a6ff; }

/* Feedback */
.feedback-section {
  margin-top: 20px;
  border-top: 1px solid #21262d;
  padding-top: 16px;
}

.feedback-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8892b0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}
.feedback-toggle:hover { color: #58a6ff; }

.rotate-180 { transform: rotate(180deg); }

.feedback-form {
  margin-top: 12px;
}

.feedback-input {
  width: 100%;
  padding: 10px 14px;
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}
.feedback-input:focus {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}
.feedback-input::placeholder { color: #484f58; }

.feedback-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #58a6ff, #b87ee6);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.feedback-submit:hover:not(:disabled) { opacity: 0.9; }
.feedback-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-loading-sm {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
