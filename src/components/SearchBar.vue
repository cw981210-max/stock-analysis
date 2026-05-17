<template>
  <div ref="wrapperRef" class="relative w-full">
    <div class="relative">
      <!-- Search Icon -->
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <svg
          class="h-4 w-4 text-[#8892b0]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <!-- Search Input -->
      <input
        ref="inputRef"
        v-model="keyword"
        type="text"
        placeholder="输入股票代码或名称，如 600519"
        class="w-full rounded-lg border border-[#21262d] bg-[#161b22] py-2.5 pl-10 pr-4
               text-sm text-[#c9d1d9] placeholder-[#8892b0]
               outline-none transition-all duration-200
               focus:border-[#58a6ff] focus:shadow-[0_0_0_3px_rgba(88,166,255,0.15)]"
        @input="onInput"
        @keydown.escape="closeDropdown"
        @keydown.down.prevent="highlightNext"
        @keydown.up.prevent="highlightPrev"
        @keydown.enter.prevent="selectHighlighted"
      />

      <!-- Clear Button -->
      <button
        v-if="keyword.length > 0"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8892b0]
               transition-colors hover:text-[#c9d1d9]"
        @click="clearInput"
      >
        <svg
          class="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Dropdown Results -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <ul
        v-if="dropdownVisible && searchResults.length > 0"
        class="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-[#21262d]
               bg-[#161b22] py-1 shadow-xl shadow-black/30"
      >
        <li
          v-for="(stock, index) in searchResults"
          :key="stock.fullCode"
          class="flex cursor-pointer items-center justify-between px-4 py-2.5
                 transition-colors duration-100"
          :class="{
            'bg-[#1c2333]': index === highlightIndex,
          }"
          @click="onSelect(stock)"
          @mouseenter="highlightIndex = index"
        >
          <div class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-[#c9d1d9]">
              {{ stock.name }}
            </span>
          </div>
          <div class="ml-3 flex shrink-0 items-center gap-2">
            <span class="rounded bg-[#21262d] px-2 py-0.5 text-xs font-mono text-[#58a6ff]">
              {{ stock.code }}
            </span>
            <span class="text-xs text-[#8892b0]">
              {{ stock.market }}
            </span>
          </div>
        </li>
      </ul>
    </Transition>

    <!-- No Results -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="dropdownVisible && keyword.length > 0 && searchResults.length === 0 && !isLoading"
        class="absolute z-50 mt-1.5 w-full rounded-lg border border-[#21262d]
               bg-[#161b22] px-4 py-3 text-center text-sm text-[#8892b0]
               shadow-xl shadow-black/30"
      >
        未找到 "{{ keyword }}" 相关股票
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  searchResults: {
    type: Array,
    default: () => [],
  },
  searchFn: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['select'])

const wrapperRef = ref(null)
const inputRef = ref(null)
const keyword = ref('')
const dropdownVisible = ref(false)
const highlightIndex = ref(-1)
const isLoading = ref(false)

let debounceTimer = null

function onInput() {
  clearTimeout(debounceTimer)

  if (keyword.value.trim().length === 0) {
    dropdownVisible.value = false
    highlightIndex.value = -1
    return
  }

  isLoading.value = true

  debounceTimer = setTimeout(async () => {
    if (props.searchFn) {
      try {
        await props.searchFn(keyword.value.trim())
      } catch {
        // Let the parent handle errors via the searchResults prop
      } finally {
        isLoading.value = false
      }
    }
    dropdownVisible.value = true
    highlightIndex.value = -1
  }, 300)
}

function onSelect(stock) {
  emit('select', stock)
  keyword.value = ''
  dropdownVisible.value = false
  highlightIndex.value = -1
}

function closeDropdown() {
  dropdownVisible.value = false
  highlightIndex.value = -1
}

function clearInput() {
  keyword.value = ''
  dropdownVisible.value = false
  highlightIndex.value = -1
  inputRef.value?.focus()
}

function highlightNext() {
  if (!dropdownVisible.value || props.searchResults.length === 0) return
  highlightIndex.value =
    highlightIndex.value < props.searchResults.length - 1
      ? highlightIndex.value + 1
      : 0
}

function highlightPrev() {
  if (!dropdownVisible.value || props.searchResults.length === 0) return
  highlightIndex.value =
    highlightIndex.value > 0
      ? highlightIndex.value - 1
      : props.searchResults.length - 1
}

function selectHighlighted() {
  if (
    dropdownVisible.value &&
    highlightIndex.value >= 0 &&
    highlightIndex.value < props.searchResults.length
  ) {
    onSelect(props.searchResults[highlightIndex.value])
  }
}

function onClickOutside(event) {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
  clearTimeout(debounceTimer)
})
</script>
