<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface SavedPayload {
  ttsTranscript: string | null
  transcript: string | null
}

const props = defineProps<{
  jobId: number
  ttsTranscript: string | null
}>()

const emit = defineEmits<{
  saved: [payload: SavedPayload]
}>()

const toast = useToast()

const open = ref(false)
const draft = ref(props.ttsTranscript ?? '')
const saving = ref(false)
const generating = ref(false)
const highlightEl = ref<HTMLDivElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const TAG_RE = /\([^)]+\)/g

function buildHighlightHtml(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(TAG_RE, '<mark>$&</mark>') + ' '
  )
}

function syncScroll() {
  if (highlightEl.value && textareaEl.value) {
    highlightEl.value.scrollTop = textareaEl.value.scrollTop
  }
}

async function save() {
  saving.value = true
  try {
    const { data } = await api.patch<SavedPayload>(`/jobs/${props.jobId}`, {
      ttsTranscript: draft.value,
    })
    emit('saved', { ttsTranscript: data.ttsTranscript, transcript: data.transcript })
    toast.add({ severity: 'success', summary: 'Transcript saved', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({
      severity: 'error',
      summary: 'Failed to save transcript',
      detail: typeof msg === 'string' ? msg : undefined,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

async function generate() {
  generating.value = true
  try {
    const { data } = await api.post<SavedPayload>(`/jobs/${props.jobId}/generate-transcript`)
    draft.value = data.ttsTranscript ?? ''
    emit('saved', { ttsTranscript: data.ttsTranscript, transcript: data.transcript })
    toast.add({ severity: 'success', summary: 'Transcript generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({
      severity: 'error',
      summary: 'Failed to generate transcript',
      detail: typeof msg === 'string' ? msg : undefined,
      life: 5000,
    })
  } finally {
    generating.value = false
  }
}

watch(
  () => props.ttsTranscript,
  (val) => { draft.value = val ?? '' },
)
</script>

<template>
  <section class="card">
    <div class="section-header" @click="open = !open">
      <h2 class="section-title">Transcript</h2>
      <i :class="open ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="toggle-icon" />
    </div>

    <template v-if="open">
      <div class="editor-wrap">
        <div
          ref="highlightEl"
          class="editor-highlights"
          aria-hidden="true"
          v-html="buildHighlightHtml(draft)"
        />
        <textarea
          ref="textareaEl"
          v-model="draft"
          class="editor-textarea"
          spellcheck="false"
          @scroll="syncScroll"
        />
      </div>

      <div class="editor-actions">
        <Button label="Generate" icon="pi pi-sparkles" size="small" severity="secondary" :loading="generating" :disabled="saving" @click="generate" />
        <Button label="Save" icon="pi pi-check" size="small" :loading="saving" :disabled="generating" @click="save" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.card {
  background: #242424;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.toggle-icon {
  font-size: 0.75rem;
  color: #555;
}

.editor-wrap {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background: #1c1c1c;
  border: 1px solid #333;
}

.editor-highlights,
.editor-textarea {
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.7;
  padding: 0.75rem;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: auto;
  width: 100%;
  min-height: 240px;
  max-height: 480px;
  box-sizing: border-box;
}

.editor-highlights {
  position: absolute;
  inset: 0;
  color: transparent;
  pointer-events: none;
  border: none;
  overflow: hidden;
}

:deep(.editor-highlights mark) {
  background: rgba(251, 191, 36, 0.35);
  color: transparent;
  border-radius: 3px;
}

.editor-textarea {
  position: relative;
  display: block;
  background: transparent;
  color: #ccc;
  caret-color: #fff;
  border: none;
  outline: none;
  resize: vertical;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
