<template>
  <section class="smart-recommend-section">
    <h2 class="section-title">
      <span class="title-icon">🧠</span>
      智能投资建议
    </h2>
    <p class="section-desc">输入您的投资偏好，AI 首席投资官将为您量身定制投资方案</p>

    <!-- Input Form -->
    <div class="form-container">
      <div class="form-grid">
        <!-- Risk Level -->
        <div class="form-group">
          <label class="form-label">风险偏好</label>
          <div class="option-grid">
            <button
              v-for="opt in riskOptions"
              :key="opt.value"
              class="option-btn"
              :class="{ active: localRisk === opt.value }"
              @click="localRisk = opt.value"
            >
              <span class="option-icon">{{ opt.icon }}</span>
              <span class="option-text">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Investment Amount -->
        <div class="form-group">
          <label class="form-label">投资金额（万元）</label>
          <input
            v-model.number="localAmount"
            type="number"
            min="1"
            max="10000"
            placeholder="请输入投资金额"
            class="form-input"
          />
        </div>

        <!-- Holding Period Slider -->
        <div class="form-group">
          <label class="form-label">预计持有时间：<span class="slider-value">{{ periodLabel }}</span></label>
          <input
            type="range"
            v-model.number="localPeriodMonths"
            min="1"
            max="36"
            step="1"
            class="slider"
          />
          <div class="slider-ticks">
            <span>1个月</span>
            <span>12个月</span>
            <span>24个月</span>
            <span>36个月</span>
          </div>
        </div>

        <!-- Expected Return Slider -->
        <div class="form-group">
          <label class="form-label">预期收益目标：<span class="slider-value">{{ returnLabel }}</span></label>
          <input
            type="range"
            v-model.number="localReturnPct"
            min="0"
            max="200"
            step="1"
            class="slider"
          />
          <div class="slider-ticks">
            <span>保本(0%)</span>
            <span>50%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>

        <!-- Sector Preference -->
        <div class="form-group full-width">
          <label class="form-label">板块/资产偏好</label>
          <div class="option-grid sector-grid">
            <button
              v-for="opt in sectorOptions"
              :key="opt.value"
              class="option-btn"
              :class="{ active: localSector === opt.value }"
              @click="localSector = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Custom Needs -->
        <div class="form-group full-width">
          <label class="form-label">个性化需求 <span class="form-hint">（可选）</span></label>
          <textarea
            v-model="localCustom"
            placeholder="如：偏好高股息、偏好低估值蓝筹、不要推荐ST股、同时考虑可转债、希望配置部分黄金等..."
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Action -->
      <div class="form-actions">
        <button
          class="submit-btn"
          :disabled="analyzing || !canSubmit"
          @click="onSubmit"
        >
          <template v-if="analyzing">
            <span class="btn-loading"></span>
            AI 首席投资官正在制定方案...
          </template>
          <template v-else>
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            生成投资方案
          </template>
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-banner">
      <span>⚠️</span> {{ error }}
    </div>

    <!-- Result -->
    <div v-if="htmlRecommendation" class="result-container">
      <div class="result-header">
        <h3 class="result-title">AI 投资方案</h3>
        <button class="reset-btn" @click="onReset">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
          </svg>
          重新生成
        </button>
      </div>
      <div class="markdown-body" v-html="htmlRecommendation"></div>
      <span v-if="analyzing" class="typing-cursor"></span>
    </div>

    <!-- Feedback Section -->
    <div v-if="htmlRecommendation && !analyzing" class="feedback-section">
      <div class="feedback-toggle" @click="showFeedback = !showFeedback">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{{ showFeedback ? '收起反馈' : '有意见？帮助AI优化建议' }}</span>
        <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showFeedback }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div v-if="showFeedback" class="feedback-form">
        <textarea
          v-model="feedbackText"
          placeholder="请输入您的意见，如：风险偏好描述不准确、希望加入某个板块、希望调整仓位配比、某只股票不看好..."
          class="feedback-input"
          rows="3"
        ></textarea>
        <button
          class="feedback-submit"
          :disabled="!feedbackText.trim() || refining"
          @click="$emit('feedback', feedbackText)"
        >
          <template v-if="refining">AI 正在优化...</template>
          <template v-else>提交反馈，优化建议</template>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  analyzing: {
    type: Boolean,
    default: false,
  },
  htmlRecommendation: {
    type: String,
    default: '',
  },
  error: {
    type: [String, null],
    default: null,
  },
  refining: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'reset', 'feedback'])

const riskOptions = [
  { value: 'conservative', label: '保守', icon: '🛡️' },
  { value: 'steady', label: '稳健', icon: '⚖️' },
  { value: 'aggressive', label: '积极', icon: '📈' },
  { value: 'radical', label: '激进', icon: '🚀' },
]

const sectorOptions = [
  { value: 'any', label: '不限' },
  { value: 'tech', label: '科技' },
  { value: 'consumer', label: '消费' },
  { value: 'finance', label: '金融' },
  { value: 'pharma', label: '医药' },
  { value: 'energy', label: '新能源' },
  { value: 'cyclical', label: '周期' },
  { value: 'dividend', label: '高股息' },
  { value: 'bond', label: '债券/固收' },
  { value: 'fund', label: '基金/ETF' },
]

const localRisk = ref('steady')
const localAmount = ref(10)
const localPeriodMonths = ref(6)
const localReturnPct = ref(15)
const localSector = ref('any')
const localCustom = ref('')
const showFeedback = ref(false)
const feedbackText = ref('')

const periodLabel = computed(() => {
  const m = localPeriodMonths.value
  if (m <= 3) return `短线 · ${m}个月`
  if (m <= 12) return `中线 · ${m}个月`
  return `长线 · ${m}个月`
})

const returnLabel = computed(() => {
  const r = localReturnPct.value
  if (r === 0) return '保本为主'
  if (r > 100) return `年化收益 ${r}%（追求翻倍机会）`
  return `年化收益 ${r}%`
})

const canSubmit = computed(() => {
  return localRisk.value && localAmount.value > 0
})

function onSubmit() {
  if (!canSubmit.value || props.analyzing) return
  emit('submit', {
    riskLevel: localRisk.value,
    investmentAmount: localAmount.value,
    holdingMonths: localPeriodMonths.value,
    expectedReturnPct: localReturnPct.value,
    sectorPreference: localSector.value,
    customNeeds: localCustom.value,
  })
}

function onReset() {
  emit('reset')
}
</script>

<style scoped>
.smart-recommend-section {
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #c9d1d9;
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 20px;
}

.section-desc {
  color: #8892b0;
  font-size: 13px;
  margin: 0 0 24px 0;
}

/* Form */
.form-container {
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #c9d1d9;
}

.form-hint {
  color: #484f58;
  font-weight: 400;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.form-input::placeholder {
  color: #484f58;
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.form-textarea::placeholder {
  color: #484f58;
}

/* Option buttons */
.option-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  color: #8892b0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.option-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.option-btn:hover {
  border-color: #30363d;
  color: #c9d1d9;
}

.option-btn.active {
  border-color: #58a6ff;
  background-color: rgba(88, 166, 255, 0.1);
  color: #58a6ff;
  font-weight: 500;
}

.option-icon {
  font-size: 14px;
}

.sector-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Slider */
.slider-value {
  color: #58a6ff;
  font-weight: 600;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  outline: none;
  margin: 8px 0;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #58a6ff, #b87ee6);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.3);
  transition: transform 0.15s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #58a6ff, #b87ee6);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.3);
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #484f58;
  padding: 0 2px;
}

/* Submit */
.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #58a6ff, #b87ee6);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(88, 166, 255, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.error-banner {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 8px;
  color: #e94560;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Result */
.result-container {
  margin-top: 24px;
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 24px;
  position: relative;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #21262d;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: #c9d1d9;
  margin: 0;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #21262d;
  border-radius: 6px;
  color: #8892b0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  border-color: #58a6ff;
  color: #58a6ff;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background-color: #58a6ff;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink-cursor 1s step-end infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

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

.feedback-form { margin-top: 12px; }

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
</style>
