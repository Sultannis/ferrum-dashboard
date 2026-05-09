<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface JobStatus {
  status: string
  transcriptStatus: string
  chunksStatus: string
  imagePromptsStatus: string
  imagesStatus: string
  audioStatus: string
  audioBreakdownStatus: string
  subtitlesStatus: string
  videoStatus: string
  addSubtitles: boolean
  srtStatus: string
}

interface StepAction {
  key: string
  label: string
  endpoint: string
  background: boolean
  params?: Record<string, unknown>
}

const props = defineProps<{ jobId: number; jobStatus: JobStatus }>()
const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const busy = ref<Record<string, boolean>>({})

function statusSeverity(s: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  switch (s) {
    case 'done':
    case 'completed': return 'success'
    case 'pending':   return 'secondary'
    case 'in_progress':
    case 'processing':
    case 'in-progress': return 'info'
    case 'failed':
    case 'error':     return 'danger'
    default:          return 'warn'
  }
}

async function run(key: string, endpoint: string, background = false, params?: Record<string, unknown>) {
  busy.value[key] = true
  try {
    await api.post(`/jobs/${props.jobId}/${endpoint}`, undefined, { params })
    if (background) {
      toast.add({ severity: 'info', summary: 'Started', detail: 'Running in background — refresh to check progress', life: 4000 })
    } else {
      toast.add({ severity: 'success', summary: 'Done', life: 3000 })
      emit('refresh')
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed', detail: typeof msg === 'string' ? msg : endpoint, life: 5000 })
  } finally {
    busy.value[key] = false
  }
}

const steps: Array<{ label: string; statusKey: keyof JobStatus; actions: StepAction[]; hidden?: boolean }> = [
  {
    label: 'Transcript',
    statusKey: 'transcriptStatus' as keyof JobStatus,
    actions: [
      { key: 'transcript', label: 'Generate', endpoint: 'generate-transcript', background: false },
    ],
  },
  {
    label: 'Chunks',
    statusKey: 'chunksStatus' as keyof JobStatus,
    actions: [
      { key: 'chunks', label: 'Split transcript', endpoint: 'split-transcript', background: false, params: { applyDefaultEffectsSetup: true } },
    ],
  },
  {
    label: 'Image prompts',
    statusKey: 'imagePromptsStatus' as keyof JobStatus,
    actions: [
      { key: 'imgprompts', label: 'Generate', endpoint: 'generate-image-prompts', background: false },
    ],
  },
  {
    label: 'Images',
    statusKey: 'imagesStatus' as keyof JobStatus,
    actions: [
      { key: 'images', label: 'Generate', endpoint: 'generate-images', background: true },
      { key: 'reimages', label: 'Retry failed', endpoint: 'regenerate-failed-images', background: true },
    ],
  },
  {
    label: 'Audio',
    statusKey: 'audioStatus' as keyof JobStatus,
    actions: [
      { key: 'audio', label: 'Generate', endpoint: 'generate-narration-audio', background: true },
    ],
  },
  {
    label: 'Audio breakdown',
    statusKey: 'audioBreakdownStatus' as keyof JobStatus,
    actions: [
      { key: 'audiobd', label: 'Breakdown', endpoint: 'breakdown-audio-by-chunks', background: false },
    ],
  },
  {
    label: 'Video',
    statusKey: 'videoStatus' as keyof JobStatus,
    actions: [
      { key: 'video', label: 'Assemble', endpoint: 'assemble-final-video', background: false },
    ],
  },
  {
    label: 'Subtitles',
    statusKey: 'subtitlesStatus' as keyof JobStatus,
    actions: [
      { key: 'subtitles', label: 'Add subtitles', endpoint: 'add-subtitles', background: false },
    ],
    hidden: !props.jobStatus.addSubtitles,
  },
  {
    label: 'Subtitle file',
    statusKey: 'srtStatus' as keyof JobStatus,
    actions: [
      { key: 'srt', label: 'Generate SRT', endpoint: 'generate-subtitles-file', background: false },
    ],
  },
]
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <div class="header-left">
        <h2 class="section-title">Pipeline</h2>
        <Tag :value="jobStatus.status" :severity="statusSeverity(jobStatus.status)" />
      </div>
      <Button icon="pi pi-refresh" text severity="secondary" size="small" aria-label="Refresh" @click="emit('refresh')" />
    </div>

    <div class="steps">
      <div v-for="step in steps" v-show="!step.hidden" :key="step.statusKey" class="step-row">
        <span class="step-label">{{ step.label }}</span>
        <Tag :value="jobStatus[step.statusKey] as string" :severity="statusSeverity(jobStatus[step.statusKey] as string)" class="step-tag" />
        <div class="step-actions">
          <Button
            v-for="action in step.actions"
            :key="action.key"
            :label="action.label"
            size="small"
            severity="secondary"
            :loading="busy[action.key]"
            :disabled="Object.values(busy).some(Boolean) && !busy[action.key]"
            @click="run(action.key, action.endpoint, action.background, action.params)"
          />
        </div>
      </div>
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

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.55rem 0.5rem;
  border-radius: 6px;
  transition: background 0.1s;
}

.step-row:hover {
  background: #1c1c1c;
}

.step-label {
  font-size: 0.875rem;
  color: #ccc;
  width: 130px;
  flex-shrink: 0;
}

.step-tag {
  width: 90px;
  justify-content: center;
}

.step-actions {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}
</style>
