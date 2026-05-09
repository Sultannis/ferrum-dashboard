<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface YoutubeTitle {
  id: number
  title: string
}

const props = defineProps<{
  jobId: number
  youtubeTitles: YoutubeTitle[]
  youtubeDescription: string | null
  youtubeTags: string | null
}>()

const emit = defineEmits<{
  refresh: []
}>()

const toast = useToast()

const generatingTitles = ref(false)
const generatingDescription = ref(false)
const generatingTags = ref(false)
const savingDescription = ref(false)
const savingTags = ref(false)

const descriptionDraft = ref(props.youtubeDescription ?? '')
const tagsDraft = ref(props.youtubeTags ?? '')
const copiedId = ref<number | null>(null)

watch(() => props.youtubeDescription, (val) => { descriptionDraft.value = val ?? '' })
watch(() => props.youtubeTags, (val) => { tagsDraft.value = val ?? '' })

async function generateTitles() {
  generatingTitles.value = true
  try {
    await api.post(`/jobs/${props.jobId}/generate-youtube-titles`)
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Titles generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate titles', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingTitles.value = false
  }
}

async function generateDescription() {
  generatingDescription.value = true
  try {
    const { data } = await api.post<{ youtubeDescription: string }>(`/jobs/${props.jobId}/generate-youtube-description`)
    descriptionDraft.value = data.youtubeDescription ?? ''
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Description generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate description', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingDescription.value = false
  }
}

async function generateTags() {
  generatingTags.value = true
  try {
    const { data } = await api.post<{ youtubeTags: string }>(`/jobs/${props.jobId}/generate-youtube-tags`)
    tagsDraft.value = data.youtubeTags ?? ''
    emit('refresh')
    toast.add({ severity: 'success', summary: 'Tags generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate tags', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingTags.value = false
  }
}

async function saveDescription() {
  savingDescription.value = true
  try {
    await api.patch(`/jobs/${props.jobId}`, { youtubeDescription: descriptionDraft.value })
    toast.add({ severity: 'success', summary: 'Description saved', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to save description', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    savingDescription.value = false
  }
}

async function saveTags() {
  savingTags.value = true
  try {
    await api.patch(`/jobs/${props.jobId}`, { youtubeTags: tagsDraft.value })
    toast.add({ severity: 'success', summary: 'Tags saved', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to save tags', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    savingTags.value = false
  }
}

async function copyTitle(title: YoutubeTitle) {
  await navigator.clipboard.writeText(title.title)
  copiedId.value = title.id
  setTimeout(() => { copiedId.value = null }, 2000)
}
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <h2 class="section-title">YouTube</h2>
    </div>

    <!-- Titles -->
    <div class="block">
      <div class="block-header">
        <span class="block-label">Titles</span>
        <Button
          label="Generate"
          icon="pi pi-sparkles"
          size="small"
          text
          :loading="generatingTitles"
          @click="generateTitles"
        />
      </div>
      <div v-if="youtubeTitles.length" class="titles-list">
        <div
          v-for="item in youtubeTitles"
          :key="item.id"
          class="title-item"
          @click="copyTitle(item)"
        >
          <span class="title-text">{{ item.title }}</span>
          <i :class="copiedId === item.id ? 'pi pi-check' : 'pi pi-copy'" class="copy-icon" />
        </div>
      </div>
      <p v-else class="empty-hint">No titles yet — click Generate to create options.</p>
    </div>

    <!-- Description -->
    <div class="block">
      <div class="block-header">
        <span class="block-label">Description</span>
        <div class="block-actions">
          <Button
            label="Generate"
            icon="pi pi-sparkles"
            size="small"
            text
            :loading="generatingDescription"
            :disabled="savingDescription"
            @click="generateDescription"
          />
          <Button
            label="Save"
            icon="pi pi-check"
            size="small"
            text
            :loading="savingDescription"
            :disabled="generatingDescription"
            @click="saveDescription"
          />
        </div>
      </div>
      <Textarea v-model="descriptionDraft" rows="6" fluid class="field-textarea" />
    </div>

    <!-- Tags -->
    <div class="block">
      <div class="block-header">
        <span class="block-label">Tags</span>
        <div class="block-actions">
          <Button
            label="Generate"
            icon="pi pi-sparkles"
            size="small"
            text
            :loading="generatingTags"
            :disabled="savingTags"
            @click="generateTags"
          />
          <Button
            label="Save"
            icon="pi pi-check"
            size="small"
            text
            :loading="savingTags"
            :disabled="generatingTags"
            @click="saveTags"
          />
        </div>
      </div>
      <Textarea v-model="tagsDraft" rows="3" fluid class="field-textarea" placeholder="tag1, tag2, tag3" />
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

.titles-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.title-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  background: #1c1c1c;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.title-item:hover {
  border-color: #555;
}

.title-text {
  font-size: 0.88rem;
  color: #ddd;
  line-height: 1.45;
}

.copy-icon {
  font-size: 0.78rem;
  color: #666;
  flex-shrink: 0;
}

.empty-hint {
  font-size: 0.82rem;
  color: #555;
  margin: 0;
}

.field-textarea {
  font-size: 0.88rem;
  line-height: 1.6;
}
</style>
