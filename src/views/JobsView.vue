<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

interface Job {
  id: number
  name: string
  niche: string
  status: string
  transcriptStatus: string
  chunksStatus: string
  imagesStatus: string
  audioStatus: string
  videoStatus: string
  channelId: number | null
  addSubtitles: boolean
  createdAt: string
}

const jobs = ref<Job[]>([])
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

async function loadJobs() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/jobs')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    jobs.value = body.data
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load jobs'
  } finally {
    loading.value = false
  }
}

onMounted(loadJobs)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Jobs</h1>
    </div>

    <p v-if="error" class="fetch-error">{{ error }}</p>

    <DataTable
      v-else
      :value="jobs"
      :loading="loading"
      striped-rows
      row-hover
      scrollable
      class="jobs-table"
    >
      <Column field="id" header="ID" style="width: 60px; min-width: 60px" />
      <Column field="name" header="Name" style="min-width: 220px" />
      <Column field="channelId" header="Channel" style="width: 100px; min-width: 100px">
        <template #body="{ data }">
          <span class="channel-cell">{{ data.channelId ?? '—' }}</span>
        </template>
      </Column>
      <Column field="niche" header="Niche" style="width: 140px; min-width: 140px" />
      <Column field="status" header="Status" style="width: 120px; min-width: 120px">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="transcriptStatus" header="Transcript" style="width: 120px; min-width: 120px">
        <template #body="{ data }">
          <Tag :value="data.transcriptStatus" :severity="statusSeverity(data.transcriptStatus)" />
        </template>
      </Column>
      <Column field="chunksStatus" header="Chunks" style="width: 110px; min-width: 110px">
        <template #body="{ data }">
          <Tag :value="data.chunksStatus" :severity="statusSeverity(data.chunksStatus)" />
        </template>
      </Column>
      <Column field="imagesStatus" header="Images" style="width: 110px; min-width: 110px">
        <template #body="{ data }">
          <Tag :value="data.imagesStatus" :severity="statusSeverity(data.imagesStatus)" />
        </template>
      </Column>
      <Column field="audioStatus" header="Audio" style="width: 110px; min-width: 110px">
        <template #body="{ data }">
          <Tag :value="data.audioStatus" :severity="statusSeverity(data.audioStatus)" />
        </template>
      </Column>
      <Column field="videoStatus" header="Video" style="width: 110px; min-width: 110px">
        <template #body="{ data }">
          <Tag :value="data.videoStatus" :severity="statusSeverity(data.videoStatus)" />
        </template>
      </Column>
      <Column field="createdAt" header="Created" style="width: 130px; min-width: 130px">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>
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
  justify-content: space-between;
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

.channel-cell {
  font-size: 0.85rem;
  color: #aaa;
}

:deep(.jobs-table .p-datatable-tbody > tr) {
  cursor: default;
}
</style>
