<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface Channel {
  id: number
  name: string
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
  videoStatus: string
  channelId: number | null
  channel: { id: number; name: string } | null
  addSubtitles: boolean
  createdAt: string
}

const toast = useToast()
const router = useRouter()

const jobs = ref<Job[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// ── Create modal ─────────────────────────────────────────────────────
const channels = ref<Channel[]>([])
const createOpen = ref(false)
const creating = ref(false)
const createForm = ref<{ name: string; niche: string; channelId: number | null }>({ name: '', niche: '', channelId: null })

async function openCreate() {
  createForm.value = { name: '', niche: '', channelId: null }
  createOpen.value = true
  if (channels.value.length === 0) {
    try {
      const { data } = await api.get<Channel[]>('/channels')
      channels.value = data
    } catch {
      // non-fatal: dropdown will just be empty
    }
  }
}

async function submitCreate() {
  if (!createForm.value.name.trim()) {
    createError.value = 'Name is required'
    return
  }
  creating.value = true
  try {
    const body: Record<string, unknown> = { name: createForm.value.name.trim() }
    if (createForm.value.niche.trim()) body.niche = createForm.value.niche.trim()
    if (createForm.value.channelId !== null) body.channelId = createForm.value.channelId
    await api.post('/jobs', body)
    createOpen.value = false
    await loadJobs()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({
      severity: 'error',
      summary: 'Failed to create job',
      detail: typeof msg === 'string' ? msg : undefined,
      life: 5000,
    })
  } finally {
    creating.value = false
  }
}

// ── Data ─────────────────────────────────────────────────────────────
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
    const { data } = await api.get<{ data: Job[] }>('/jobs')
    jobs.value = data.data
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    error.value = typeof msg === 'string' ? msg : 'Failed to load jobs'
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
      <Button label="New Job" icon="pi pi-plus" size="small" @click="openCreate" />
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
      @row-click="router.push({ name: 'job', params: { id: $event.data.id } })"
    >
      <Column field="id" header="ID" style="width: 60px; min-width: 60px" />
      <Column field="name" header="Name" style="min-width: 220px" />
      <Column field="channel" header="Channel" style="width: 140px; min-width: 140px">
        <template #body="{ data }">
          <span class="channel-cell">{{ data.channel?.name ?? '—' }}</span>
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

    <!-- Create modal -->
    <Dialog
      v-model:visible="createOpen"
      header="New Job"
      :style="{ width: '440px' }"
      modal
      :draggable="false"
    >
      <div class="form">
        <div class="field">
          <label>Name <span class="required">*</span></label>
          <InputText v-model="createForm.name" placeholder="e.g. Episode 42" fluid />
        </div>
        <div class="field">
          <label>Niche</label>
          <InputText v-model="createForm.niche" placeholder="e.g. Psychology (overrides channel niche)" fluid />
        </div>
        <div class="field">
          <label>Channel</label>
          <Select
            v-model="createForm.channelId"
            :options="channels"
            option-label="name"
            option-value="id"
            placeholder="Select a channel"
            fluid
          />
        </div>
        <div class="form-actions">
          <Button label="Cancel" severity="secondary" text @click="createOpen = false" />
          <Button label="Create" icon="pi pi-check" :loading="creating" @click="submitCreate" />
        </div>
      </div>
    </Dialog>
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
  cursor: pointer;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-surface-500);
}

.required {
  color: #f87171;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
</style>
