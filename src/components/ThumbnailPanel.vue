<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

const props = defineProps<{
  jobId: number
  thumbnailImagePrompt: string | null
  thumbnailImagePath: string | null
  thumbnailStatus: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const toast = useToast()
const BASE = import.meta.env.VITE_BASE_API_URL as string

const generatingPrompt = ref(false)
const savingPrompt = ref(false)
const generatingThumbnail = ref(false)
const promptDraft = ref(props.thumbnailImagePrompt ?? '')
const previewKey = ref(0)

watch(() => props.thumbnailImagePrompt, (val) => { promptDraft.value = val ?? '' })
watch(() => props.thumbnailStatus, (val) => { if (val === 'completed') previewKey.value++ })

const thumbnailSrc = computed(() =>
  props.thumbnailStatus === 'completed'
    ? `${BASE}/jobs/${props.jobId}/thumbnail?t=${previewKey.value}`
    : null,
)

const statusClass = computed(() => {
  switch (props.thumbnailStatus) {
    case 'completed': return 'status--completed'
    case 'in_progress': return 'status--in-progress'
    case 'failed': return 'status--failed'
    default: return 'status--pending'
  }
})

async function generatePrompt() {
  generatingPrompt.value = true
  try {
    const { data } = await api.post(`/jobs/${props.jobId}/generate-thumbnail-prompt`)
    promptDraft.value = data.thumbnailImagePrompt ?? ''
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Prompt generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate prompt', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingPrompt.value = false
  }
}

async function savePrompt() {
  savingPrompt.value = true
  try {
    await api.patch(`/jobs/${props.jobId}`, { thumbnailImagePrompt: promptDraft.value })
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Prompt saved', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to save prompt', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    savingPrompt.value = false
  }
}

async function generateThumbnail() {
  generatingThumbnail.value = true
  try {
    await api.post(`/jobs/${props.jobId}/generate-thumbnail`)
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Thumbnail generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to start thumbnail generation', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingThumbnail.value = false
  }
}
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <h2 class="section-title">Thumbnail</h2>
      <span :class="['status-badge', statusClass]">{{ thumbnailStatus }}</span>
    </div>

    <!-- Prompt -->
    <div class="block">
      <div class="block-header">
        <span class="block-label">Image Prompt</span>
        <div class="block-actions">
          <Button
            label="Generate Prompt"
            icon="pi pi-sparkles"
            size="small"
            text
            :loading="generatingPrompt"
            :disabled="savingPrompt || generatingThumbnail"
            @click="generatePrompt"
          />
          <Button
            label="Save"
            icon="pi pi-check"
            size="small"
            text
            :loading="savingPrompt"
            :disabled="generatingPrompt || generatingThumbnail"
            @click="savePrompt"
          />
        </div>
      </div>
      <Textarea
        v-model="promptDraft"
        rows="5"
        fluid
        class="field-textarea"
        placeholder="Thumbnail image prompt will appear here..."
      />
    </div>

    <!-- Generate button -->
    <div class="generate-row">
      <Button
        label="Generate Thumbnail"
        icon="pi pi-image"
        size="small"
        :loading="generatingThumbnail"
        :disabled="!thumbnailImagePrompt || generatingPrompt || savingPrompt"
        @click="generateThumbnail"
      />
    </div>

    <!-- Preview -->
    <div v-if="thumbnailSrc" class="preview-block">
      <span class="block-label">Preview</span>
      <img :src="thumbnailSrc" class="thumbnail-preview" alt="Thumbnail" />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: #242424;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
}

.status--pending     { background: #2a2a2a; color: #666; }
.status--in-progress { background: #1e3a5f; color: #60a5fa; }
.status--completed   { background: #1a3a2a; color: #4ade80; }
.status--failed      { background: #3a1a1a; color: #f87171; }

.block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #aaa;
}

.block-actions {
  display: flex;
  gap: 0.25rem;
}

.field-textarea {
  font-size: 0.88rem;
  line-height: 1.6;
}

.generate-row {
  display: flex;
}

.preview-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.thumbnail-preview {
  width: 100%;
  border-radius: 6px;
  border: 1px solid #333;
}
</style>
