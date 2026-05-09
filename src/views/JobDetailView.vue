<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import TranscriptEditor from '@/components/TranscriptEditor.vue'
import JobDetailsEditor from '@/components/JobDetailsEditor.vue'
import ChunksPanel from '@/components/ChunksPanel.vue'
import PipelinePanel from '@/components/PipelinePanel.vue'
import AudioPanel from '@/components/AudioPanel.vue'
import YoutubePanel from '@/components/YoutubePanel.vue'
import ThumbnailPanel from '@/components/ThumbnailPanel.vue'
import type { Chunk } from '@/components/ChunksPanel.vue'
import api from '@/api'

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
  srtFilePath: string | null
  descriptionForLlm: string | null
  transcript: string | null
  ttsTranscript: string | null
  audioPath: string | null
  youtubeTitles: { id: number; title: string }[]
  youtubeDescription: string | null
  youtubeTags: string | null
  thumbnailImagePrompt: string | null
  thumbnailImagePath: string | null
  thumbnailStatus: string
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

const BASE = import.meta.env.VITE_BASE_API_URL as string
const finalVideoUrl = computed(() => job.value ? `${BASE}/jobs/${job.value.id}/final-video` : '')
const srtUrl = computed(() => job.value ? `${BASE}/jobs/${job.value.id}/subtitles-file` : '')
const videoReady = computed(() => {
  const s = job.value?.videoStatus ?? ''
  return s === 'done' || s === 'completed'
})

function onTranscriptSaved(payload: { ttsTranscript: string | null; transcript: string | null }) {
  if (!job.value) return
  job.value.ttsTranscript = payload.ttsTranscript
  job.value.transcript = payload.transcript
}

function onDetailsSaved(payload: {
  niche: string
  channelId: number | null
  channel: { id: number; name: string } | null
  addSubtitles: boolean
  descriptionForLlm: string | null
}) {
  if (!job.value) return
  Object.assign(job.value, payload)
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
      <!-- Pipeline control -->
      <PipelinePanel
        :job-id="job.id"
        :job-status="{
          status: job.status,
          transcriptStatus: job.transcriptStatus,
          chunksStatus: job.chunksStatus,
          imagePromptsStatus: job.imagePromptsStatus,
          imagesStatus: job.imagesStatus,
          audioStatus: job.audioStatus,
          audioBreakdownStatus: job.audioBreakdownStatus,
          subtitlesStatus: job.subtitlesStatus,
          videoStatus: job.videoStatus,
          addSubtitles: job.addSubtitles,
          srtStatus: job.srtFilePath ? 'completed' : 'pending',
        }"
        @refresh="loadJob"
      />

      <!-- Final video -->
      <section v-if="videoReady" class="card">
        <h2 class="section-title">Final video</h2>
        <video :src="finalVideoUrl" controls class="final-video" />
        <div class="video-actions">
          <a :href="finalVideoUrl" download class="download-link">
            <Button label="Download" icon="pi pi-download" size="small" severity="secondary" />
          </a>
        </div>
      </section>

      <!-- Subtitles file -->
      <section v-if="job.srtFilePath" class="card">
        <h2 class="section-title">Subtitles file</h2>
        <div class="video-actions">
          <a :href="srtUrl" download="subtitles.srt" class="download-link">
            <Button label="Download SRT" icon="pi pi-download" size="small" severity="secondary" />
          </a>
        </div>
      </section>

      <!-- Details -->
      <JobDetailsEditor
        :job-id="job.id"
        :niche="job.niche"
        :channel-id="job.channelId"
        :add-subtitles="job.addSubtitles"
        :description-for-llm="job.descriptionForLlm"
        :created-at="job.createdAt"
        @saved="onDetailsSaved"
      />

      <!-- Transcript editor -->
      <TranscriptEditor
        :job-id="job.id"
        :tts-transcript="job.ttsTranscript"
        @saved="onTranscriptSaved"
      />

      <!-- Audio -->
      <AudioPanel
        :job-id="job.id"
        :audio-status="job.audioStatus"
        :audio-breakdown-status="job.audioBreakdownStatus"
        :has-audio="!!job.audioPath"
        @refresh="loadJob"
      />

      <!-- YouTube -->
      <YoutubePanel
        :job-id="job.id"
        :youtube-titles="job.youtubeTitles"
        :youtube-description="job.youtubeDescription"
        :youtube-tags="job.youtubeTags"
        @refresh="loadJob"
      />

      <!-- Thumbnail -->
      <ThumbnailPanel
        :job-id="job.id"
        :thumbnail-image-prompt="job.thumbnailImagePrompt"
        :thumbnail-image-path="job.thumbnailImagePath"
        :thumbnail-status="job.thumbnailStatus"
        @refresh="loadJob"
      />

      <!-- Chunks -->
      <ChunksPanel :chunks="job.chunks" :job-id="job.id" @chunks-generated="job.chunks = $event" />
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

.final-video {
  width: 100%;
  border-radius: 6px;
  background: #000;
}

.video-actions {
  display: flex;
}

.download-link {
  text-decoration: none;
}
</style>
