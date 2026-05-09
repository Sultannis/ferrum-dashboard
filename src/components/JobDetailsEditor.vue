<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface Channel {
  id: number
  name: string
}

interface DetailsPayload {
  niche: string
  channelId: number | null
  channel: { id: number; name: string } | null
  addSubtitles: boolean
  descriptionForLlm: string | null
}

const props = defineProps<{
  jobId: number
  niche: string
  channelId: number | null
  addSubtitles: boolean
  descriptionForLlm: string | null
  createdAt: string
}>()

const emit = defineEmits<{
  saved: [payload: DetailsPayload]
}>()

const toast = useToast()

const channels = ref<Channel[]>([])
const saving = ref(false)

const form = ref({
  niche: props.niche,
  channelId: props.channelId,
  addSubtitles: props.addSubtitles,
  descriptionForLlm: props.descriptionForLlm ?? '',
})

watch(
  () => [props.niche, props.channelId, props.addSubtitles, props.descriptionForLlm] as const,
  ([niche, channelId, addSubtitles, descriptionForLlm]) => {
    form.value = { niche, channelId, addSubtitles, descriptionForLlm: descriptionForLlm ?? '' }
  },
)

async function loadChannels() {
  try {
    const { data } = await api.get<Channel[]>('/channels')
    channels.value = data
  } catch {
    // non-fatal
  }
}

async function save() {
  saving.value = true
  try {
    const body = {
      niche: form.value.niche,
      channelId: form.value.channelId,
      addSubtitles: form.value.addSubtitles,
      descriptionForLlm: form.value.descriptionForLlm || null,
    }
    const { data } = await api.patch<DetailsPayload>(`/jobs/${props.jobId}`, body)
    emit('saved', {
      niche: data.niche,
      channelId: data.channelId,
      channel: data.channel,
      addSubtitles: data.addSubtitles,
      descriptionForLlm: data.descriptionForLlm,
    })
    toast.add({ severity: 'success', summary: 'Details saved', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({
      severity: 'error',
      summary: 'Failed to save details',
      detail: typeof msg === 'string' ? msg : undefined,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

onMounted(loadChannels)
</script>

<template>
  <section class="card">
    <h2 class="section-title">Details</h2>

    <div class="form">
      <div class="field-row">
        <div class="field">
          <label class="field-label">Niche</label>
          <InputText v-model="form.niche" fluid />
        </div>
        <div class="field">
          <label class="field-label">Channel</label>
          <Select
            v-model="form.channelId"
            :options="channels"
            option-label="name"
            option-value="id"
            placeholder="No channel"
            show-clear
            fluid
          />
        </div>
      </div>

      <div class="field">
        <label class="field-label">Description for LLM</label>
        <Textarea v-model="form.descriptionForLlm" rows="4" fluid />
      </div>

      <div class="field-row field-row--baseline">
        <div class="field field--inline">
          <label class="field-label">Add subtitles</label>
          <ToggleSwitch v-model="form.addSubtitles" />
        </div>
        <div class="field field--inline">
          <label class="field-label">Created</label>
          <span class="read-only-value">{{ new Date(createdAt).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="actions">
      <Button label="Save" icon="pi pi-check" size="small" :loading="saving" @click="save" />
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

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
  flex: unset;
}

.field-label {
  font-size: 0.82rem;
  color: #888;
  white-space: nowrap;
}

.field-row {
  display: flex;
  gap: 1rem;
}

.field-row--baseline {
  align-items: center;
  justify-content: space-between;
}

.read-only-value {
  font-size: 0.88rem;
  color: #ccc;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
