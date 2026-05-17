<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="onOverlayClick"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <!-- Modal Card -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="modelValue"
          class="relative z-10 w-full max-w-md rounded-xl border border-[#21262d]
                 bg-[#161b22] p-6 shadow-2xl shadow-black/50"
          @click.stop
        >
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-[#c9d1d9]">设置</h2>
            <button
              class="rounded-lg p-1.5 text-[#8892b0] transition-colors
                     hover:bg-[#21262d] hover:text-[#c9d1d9]"
              @click="cancel"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Provider Selector -->
          <div class="mb-5">
            <label class="mb-1.5 block text-sm font-medium text-[#c9d1d9]">
              AI 模型服务商
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="p in providers"
                :key="p.id"
                @click="onProviderChange(p.id)"
                class="rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200"
                :class="localProvider === p.id
                  ? 'border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]'
                  : 'border-[#21262d] bg-[#0d1117] text-[#8892b0] hover:border-[#30363d] hover:text-[#c9d1d9]'"
              >
                {{ p.name }}
              </button>
            </div>
          </div>

          <!-- Model Selector -->
          <div class="mb-5">
            <label class="mb-1.5 block text-sm font-medium text-[#c9d1d9]">
              模型
            </label>
            <div class="relative">
              <select
                v-model="localModel"
                class="w-full appearance-none rounded-lg border border-[#21262d] bg-[#0d1117]
                       py-2.5 pl-3.5 pr-10 text-sm text-[#c9d1d9]
                       outline-none transition-all duration-200
                       focus:border-[#58a6ff] focus:shadow-[0_0_0_3px_rgba(88,166,255,0.15)]"
              >
                <option v-for="m in currentModels" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="h-4 w-4 text-[#8892b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          <!-- API Key Field -->
          <div class="mb-5">
            <label class="mb-1.5 block text-sm font-medium text-[#c9d1d9]">
              API Key
            </label>
            <div class="relative">
              <input
                :type="showApiKey ? 'text' : 'password'"
                :value="localApiKey"
                :placeholder="apiKeyPlaceholder"
                class="w-full rounded-lg border border-[#21262d] bg-[#0d1117] py-2.5
                       pl-3.5 pr-10 text-sm text-[#c9d1d9] placeholder-[#8892b0]
                       outline-none transition-all duration-200
                       focus:border-[#58a6ff] focus:shadow-[0_0_0_3px_rgba(88,166,255,0.15)]"
                @input="onApiKeyInput"
              />
              <button
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8892b0]
                       transition-colors hover:text-[#c9d1d9]"
                type="button"
                @click="showApiKey = !showApiKey"
              >
                <svg v-if="!showApiKey" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Proxy URL (optional) -->
          <div class="mb-6">
            <label class="mb-1.5 block text-sm font-medium text-[#c9d1d9]">
              代理地址 <span class="text-[#8892b0] font-normal">(可选)</span>
            </label>
            <input
              :value="localProxy"
              placeholder="如 https://your-proxy.com 留空直连"
              class="w-full rounded-lg border border-[#21262d] bg-[#0d1117] py-2.5
                     pl-3.5 pr-4 text-sm text-[#c9d1d9] placeholder-[#8892b0]
                     outline-none transition-all duration-200
                     focus:border-[#58a6ff] focus:shadow-[0_0_0_3px_rgba(88,166,255,0.15)]"
              @input="onProxyInput"
            />
            <p class="mt-1.5 text-xs text-[#8892b0]">如遇跨域(CORS)错误，填入你的 API 代理地址</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3">
            <button
              class="rounded-lg border border-[#21262d] bg-transparent px-4 py-2
                     text-sm font-medium text-[#8892b0] transition-colors
                     hover:border-[#30363d] hover:text-[#c9d1d9]"
              @click="cancel"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-[#58a6ff] px-4 py-2 text-sm font-medium
                     text-[#0d1117] transition-colors hover:bg-[#79b8ff]
                     active:bg-[#4090e0]"
              @click="save"
            >
              保存
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { PROVIDERS, getProviderModels } from '../api/openai.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  apiKey: { type: String, default: '' },
  provider: { type: String, default: 'openai' },
  model: { type: String, default: 'gpt-4o-mini' },
  proxyUrl: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:apiKey', 'update:provider', 'update:model', 'update:proxyUrl'])

const providers = PROVIDERS
const localApiKey = ref(props.apiKey)
const localProvider = ref(props.provider)
const localModel = ref(props.model)
const localProxy = ref(props.proxyUrl)
const showApiKey = ref(false)

const currentModels = computed(() => getProviderModels(localProvider.value))

const apiKeyPlaceholder = computed(() => {
  const map = {
    openai: 'sk-...',
    deepseek: 'sk-...',
    claude: 'sk-ant-...',
    kimi: 'sk-...',
    glm: 'xxxxxxxx.xxxxxxxx',
  }
  return map[localProvider.value] || '输入 API Key'
})

watch(() => props.apiKey, (val) => { localApiKey.value = val })
watch(() => props.provider, (val) => { localProvider.value = val })
watch(() => props.model, (val) => { localModel.value = val })
watch(() => props.proxyUrl, (val) => { localProxy.value = val })

watch(() => props.modelValue, (visible) => {
  if (visible) {
    localApiKey.value = props.apiKey
    localProvider.value = props.provider
    localModel.value = props.model
    localProxy.value = props.proxyUrl
  }
})

function onProviderChange(providerId) {
  localProvider.value = providerId
  const models = getProviderModels(providerId)
  localModel.value = models[0].id
}

function onApiKeyInput(event) {
  localApiKey.value = event.target.value
}

function onProxyInput(event) {
  localProxy.value = event.target.value
}

function onOverlayClick() { cancel() }

function save() {
  emit('update:apiKey', localApiKey.value)
  emit('update:provider', localProvider.value)
  emit('update:model', localModel.value)
  emit('update:proxyUrl', localProxy.value)
  emit('update:modelValue', false)
}

function cancel() {
  emit('update:modelValue', false)
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) cancel()
}

onMounted(() => { document.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown) })
</script>
