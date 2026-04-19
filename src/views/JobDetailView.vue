<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import api from '@/api'

interface Chunk {
  id: number
  orderingIndex: number
  text: string | null
  durationSeconds: number | null
}

interface Job {
  id: number
  name: string
  niche: string
  status: string
  transcriptStatus: string
  chunksStatus: string
  imagesStatus: string
  audioStatus: string
  audioBreakdownStatus: string
  imagePromptsStatus: string
  subtitlesStatus: string
  videoStatus: string
  addSubtitles: boolean
  descriptionForLlm: string | null
  transcript: string | null
  ttsTranscript: string | null
  audioPath: string | null
  channelId: number | null
  channel: { id: number; name: string } | null
  createdAt: string
  chunks: Chunk[]
}

const route = useRoute()
const router = useRouter()

const job = ref<Job | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  switch (status) {
    case 'done':
    case 'completed':
      return 'success'
    case 'pending':
      return 'secondary'
    case 'in_progress':
    case 'processing':
      return 'info'
    case 'failed':
    case 'error':
      return 'danger'
    default:
      return 'warn'
  }
}

async function loadJob() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<Job>(`/jobs/${route.params.id}`)
    job.value = data
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    error.value = typeof msg === 'string' ? msg : 'Failed to load job'
  } finally {
    loading.value = false
  }
}

onMounted(loadJob)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <Button icon="pi pi-arrow-left" text severity="secondary" size="small" @click="router.push({ name: 'jobs' })" />
      <h1 v-if="job" class="page-title">{{ job.name }}</h1>
    </div>

    <p v-if="error" class="fetch-error">{{ error }}</p>

    <template v-if="!loading && job">
      <!-- Status grid -->
      <section class="card">
        <h2 class="section-title">Pipeline status</h2>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Overall</span>
            <Tag :value="job.status" :severity="statusSeverity(job.status)" />
          </div>
          <div class="status-item">
            <span class="status-label">Transcript</span>
            <Tag :value="job.transcriptStatus" :severity="statusSeverity(job.transcriptStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Chunks</span>
            <Tag :value="job.chunksStatus" :severity="statusSeverity(job.chunksStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Image prompts</span>
            <Tag :value="job.imagePromptsStatus" :severity="statusSeverity(job.imagePromptsStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Images</span>
            <Tag :value="job.imagesStatus" :severity="statusSeverity(job.imagesStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Audio</span>
            <Tag :value="job.audioStatus" :severity="statusSeverity(job.audioStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Audio breakdown</span>
            <Tag :value="job.audioBreakdownStatus" :severity="statusSeverity(job.audioBreakdownStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Subtitles</span>
            <Tag :value="job.subtitlesStatus" :severity="statusSeverity(job.subtitlesStatus)" />
          </div>
          <div class="status-item">
            <span class="status-label">Video</span>
            <Tag :value="job.videoStatus" :severity="statusSeverity(job.videoStatus)" />
          </div>
        </div>
      </section>

      <!-- Details -->
      <section class="card">
        <h2 class="section-title">Details</h2>
        <div class="details-grid">
          <div class="detail-row">
            <span class="detail-label">Niche</span>
            <span class="detail-value">{{ job.niche }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Channel</span>
            <span class="detail-value">{{ job.channel?.name ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Add subtitles</span>
            <span class="detail-value">{{ job.addSubtitles ? 'Yes' : 'No' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created</span>
            <span class="detail-value">{{ new Date(job.createdAt).toLocaleString() }}</span>
          </div>
          <div v-if="job.descriptionForLlm" class="detail-row detail-row--block">
            <span class="detail-label">Description for LLM</span>
            <span class="detail-value detail-value--pre">{{ job.descriptionForLlm }}</span>
          </div>
        </div>
      </section>

      <!-- Transcript -->
      <section v-if="job.transcript" class="card">
        <h2 class="section-title">Transcript</h2>
        <p class="text-block">{{ job.transcript }}</p>
      </section>

      <!-- Chunks -->
      <section v-if="job.chunks?.length" class="card">
        <h2 class="section-title">Chunks ({{ job.chunks.length }})</h2>
        <div class="chunks-list">
          <div v-for="chunk in job.chunks" :key="chunk.id" class="chunk-item">
            <span class="chunk-index">#{{ chunk.orderingIndex + 1 }}</span>
            <p class="chunk-text">{{ chunk.text }}</p>
            <span v-if="chunk.durationSeconds != null" class="chunk-duration">{{ chunk.durationSeconds }}s</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #e0e0e0;
}

.fetch-error {
  color: #f87171;
  font-size: 0.9rem;
}

.card {
  background: #242424;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.status-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
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

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detail-row {
  display: flex;
  gap: 1rem;
  align-items: baseline;
}

.detail-row--block {
  flex-direction: column;
  gap: 0.35rem;
}

.detail-label {
  font-size: 0.82rem;
  color: #888;
  min-width: 140px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 0.9rem;
  color: #ddd;
}

.detail-value--pre {
  white-space: pre-wrap;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #ccc;
}

.text-block {
  font-size: 0.88rem;
  line-height: 1.7;
  color: #ccc;
  white-space: pre-wrap;
  margin: 0;
}

.chunks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chunk-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.6rem 0.75rem;
  background: #1c1c1c;
  border-radius: 6px;
}

.chunk-index {
  font-size: 0.75rem;
  color: #555;
  min-width: 28px;
  padding-top: 0.1rem;
  flex-shrink: 0;
}

.chunk-text {
  flex: 1;
  font-size: 0.85rem;
  color: #ccc;
  line-height: 1.5;
  margin: 0;
}

.chunk-duration {
  font-size: 0.75rem;
  color: #666;
  flex-shrink: 0;
  padding-top: 0.1rem;
}
</style>
