<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

const props = defineProps<{
  jobId: number
  audioStatus: string
  audioBreakdownStatus: string
  hasAudio: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const BASE = import.meta.env.VITE_BASE_API_URL as string

const generatingAudio = ref(false)
const breakingDown = ref(false)
const audioCacheBust = ref(0)

const audioUrl = computed(() =>
  `${BASE}/jobs/${props.jobId}/audio${audioCacheBust.value ? `?t=${audioCacheBust.value}` : ''}`,
)

const audioReady = computed(() =>
  props.audioStatus === 'completed' || props.audioStatus === 'done',
)

function statusSeverity(s: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  switch (s) {
    case 'done':
    case 'completed':   return 'success'
    case 'pending':     return 'secondary'
    case 'in_progress':
    case 'in-progress':
    case 'processing':  return 'info'
    case 'failed':
    case 'error':       return 'danger'
    default:            return 'warn'
  }
}

async function generateAudio() {
  generatingAudio.value = true
  try {
    await api.post(`/jobs/${props.jobId}/generate-narration-audio`)
    toast.add({
      severity: 'info',
      summary: 'Audio generation started',
      detail: 'Running in background — click Refresh when done',
      life: 5000,
    })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate audio', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingAudio.value = false
  }
}

async function breakdownAudio() {
  breakingDown.value = true
  try {
    await api.post(`/jobs/${props.jobId}/breakdown-audio-by-chunks`)
    audioCacheBust.value = Date.now()
    toast.add({ severity: 'success', summary: 'Audio breakdown complete', life: 3000 })
    emit('refresh')
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Breakdown failed', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    breakingDown.value = false
  }
}
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <h2 class="section-title">Audio</h2>
      <Button icon="pi pi-refresh" text severity="secondary" size="small" aria-label="Refresh" @click="emit('refresh')" />
    </div>

    <!-- Status row -->
    <div class="status-row">
      <div class="status-item">
        <span class="status-label">Narration</span>
        <Tag :value="audioStatus" :severity="statusSeverity(audioStatus)" />
      </div>
      <div class="status-item">
        <span class="status-label">Breakdown</span>
        <Tag :value="audioBreakdownStatus" :severity="statusSeverity(audioBreakdownStatus)" />
      </div>
    </div>

    <!-- Player -->
    <audio v-if="audioReady || hasAudio" :src="audioUrl" controls class="audio-player" />

    <!-- Actions -->
    <div class="actions">
      <Button
        label="Generate narration audio"
        icon="pi pi-sparkles"
        size="small"
        severity="secondary"
        :loading="generatingAudio"
        :disabled="breakingDown"
        @click="generateAudio"
      />
      <Button
        label="Breakdown by chunks"
        icon="pi pi-sliders-h"
        size="small"
        severity="secondary"
        :loading="breakingDown"
        :disabled="generatingAudio || !audioReady"
        @click="breakdownAudio"
      />
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
  gap: 1rem;
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

.status-row {
  display: flex;
  gap: 1.5rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.status-label {
  font-size: 0.78rem;
  color: #888;
}

.audio-player {
  width: 100%;
  border-radius: 6px;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
