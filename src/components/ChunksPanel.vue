<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import api from '@/api'

interface ImageAnimation {
  id: number
  videoPath: string | null
  includeAudio: boolean
  audioVolumeDb: number | null
}

interface ImageRevealAnimation {
  id: number
  videoPath: string | null
}

interface ChunkImage {
  id: number
  path: string | null
  prompt: string | null
  status: string
  failReason: string | null
  imageAnimation: ImageAnimation | null
  imageRevealAnimation: ImageRevealAnimation | null
}

export interface Chunk {
  id: number
  orderingIndex: number
  transcriptChunk: string | null
  audioDurationMs: number | null
  videoEffect: string | null
  outroEffect: string | null
  image: ChunkImage | null
}

const props = defineProps<{ chunks: Chunk[]; jobId: number }>()
const emit = defineEmits<{
  chunkUpdated: [chunk: Chunk]
  chunksGenerated: [chunks: Chunk[]]
}>()

const toast = useToast()
const BASE = import.meta.env.VITE_BASE_API_URL as string

const generating = ref(false)
const generatingPrompts = ref(false)
const generatingImages = ref(false)
const retryingImages = ref(false)
const assembling = ref(false)

async function generateChunks() {
  generating.value = true
  try {
    const { data } = await api.post<Chunk[]>(`/jobs/${props.jobId}/split-transcript`)
    emit('chunksGenerated', data)
    toast.add({ severity: 'success', summary: 'Chunks generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate chunks', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generating.value = false
  }
}

async function generateImagePrompts() {
  generatingPrompts.value = true
  try {
    await api.post(`/jobs/${props.jobId}/generate-image-prompts`)
    toast.add({ severity: 'success', summary: 'Image prompts generated', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to generate image prompts', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingPrompts.value = false
  }
}

async function generateImages() {
  generatingImages.value = true
  try {
    await api.post(`/jobs/${props.jobId}/generate-images`, null, { params: { batch: true } })
    toast.add({ severity: 'info', summary: 'Image generation started', detail: 'Running in background — refresh the page to see progress', life: 5000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to start image generation', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    generatingImages.value = false
  }
}

async function retryFailedImages() {
  retryingImages.value = true
  try {
    await api.post(`/jobs/${props.jobId}/regenerate-failed-images`)
    toast.add({ severity: 'info', summary: 'Retry started', detail: 'Running in background — refresh to check progress', life: 5000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to retry images', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    retryingImages.value = false
  }
}

async function assembleVideo() {
  assembling.value = true
  try {
    await api.post(`/jobs/${props.jobId}/assemble-final-video`)
    toast.add({ severity: 'success', summary: 'Video assembled', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to assemble video', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    assembling.value = false
  }
}

const expandedIds = ref(new Set<number>())
const cacheBust = ref<Record<number, number>>({})
const saving = ref<Record<number, boolean>>({})
const uploading = ref<Record<string, boolean>>({})
const regenerating = ref<Record<number, boolean>>({})
const registering = ref<Record<number, boolean>>({})

const ANIMATION_SOURCE_DIR =
  (import.meta.env.VITE_ANIMATION_SOURCE_DIR as string | undefined) ??
  `/Users/${import.meta.env.VITE_USERNAME ?? 'sultanmustafin'}/Downloads`

// Per-chunk draft state for editable fields
const drafts = ref<Record<number, { prompt: string; videoEffect: string; outroEffect: string }>>({})

function getDraft(chunk: Chunk) {
  if (!drafts.value[chunk.id]) {
    drafts.value[chunk.id] = {
      prompt: chunk.image?.prompt ?? '',
      videoEffect: chunk.videoEffect ?? '',
      outroEffect: chunk.outroEffect ?? '',
    }
  }
  return drafts.value[chunk.id]
}

function isExpanded(id: number) {
  return expandedIds.value.has(id)
}

function toggleExpand(id: number) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

function bust(imageId: number) {
  cacheBust.value[imageId] = Date.now()
}

function imageUrl(imageId: number) {
  const t = cacheBust.value[imageId] ?? ''
  return `${BASE}/images/${imageId}/file${t ? `?t=${t}` : ''}`
}

function animationUrl(imageId: number) {
  const t = cacheBust.value[imageId] ?? ''
  return `${BASE}/images/${imageId}/animation${t ? `?t=${t}` : ''}`
}

async function saveChunk(chunk: Chunk) {
  const draft = getDraft(chunk)
  saving.value[chunk.id] = true
  try {
    const calls: Promise<unknown>[] = []

    calls.push(
      api.patch(`/chunks/${chunk.id}`, {
        videoEffect: draft.videoEffect || null,
        outroEffect: draft.outroEffect || null,
      }),
    )

    if (chunk.image) {
      calls.push(api.patch(`/images/${chunk.image.id}`, { prompt: draft.prompt }))
    }

    await Promise.all(calls)
    toast.add({ severity: 'success', summary: `Chunk #${Number(chunk.orderingIndex) + 1} saved`, life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Failed to save chunk', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    saving.value[chunk.id] = false
  }
}

function imageSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  switch (status) {
    case 'completed': return 'success'
    case 'pending':   return 'secondary'
    case 'in-progress':
    case 'in_progress': return 'info'
    case 'failed':    return 'danger'
    default:          return 'warn'
  }
}

async function regenerateImage(chunk: Chunk) {
  if (!chunk.image) return
  regenerating.value[chunk.id] = true
  try {
    await api.post(`/images/${chunk.image.id}/regenerate-image`)
    bust(chunk.image.id)
    toast.add({ severity: 'success', summary: `Image regenerated for chunk #${Number(chunk.orderingIndex) + 1}`, life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Regeneration failed', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    regenerating.value[chunk.id] = false
  }
}

function triggerFileInput(inputId: string) {
  document.getElementById(inputId)?.click()
}

async function uploadImage(chunk: Chunk, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !chunk.image) return
  const key = `img-${chunk.id}`
  uploading.value[key] = true
  try {
    const form = new FormData()
    form.append('image', file)
    await api.post(`/images/${chunk.image.id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    bust(chunk.image.id)
    toast.add({ severity: 'success', summary: 'Image uploaded', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Image upload failed', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    uploading.value[key] = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function registerAnimationFromPicker(chunk: Chunk, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const sourcePath = `${ANIMATION_SOURCE_DIR}/${file.name}`
  registering.value[chunk.id] = true
  try {
    await api.post(`/chunks/${chunk.id}/register-animation`, { sourcePath })
    if (chunk.image) bust(chunk.image.id)
    toast.add({ severity: 'success', summary: 'Animation registered', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Registration failed', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    registering.value[chunk.id] = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function uploadAnimation(chunk: Chunk, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const key = `anim-${chunk.id}`
  uploading.value[key] = true
  try {
    const form = new FormData()
    form.append('animation', file)
    await api.post(`/chunks/${chunk.id}/upload-animation`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (chunk.image) bust(chunk.image.id)
    toast.add({ severity: 'success', summary: 'Animation uploaded', life: 3000 })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ severity: 'error', summary: 'Animation upload failed', detail: typeof msg === 'string' ? msg : undefined, life: 5000 })
  } finally {
    uploading.value[key] = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <section class="card">
    <div class="panel-header">
      <h2 class="section-title">Chunks ({{ chunks.length }})</h2>
      <div class="header-actions">
        <Button label="Generate chunks" icon="pi pi-sparkles" size="small" severity="secondary" :loading="generating" :disabled="generatingPrompts" @click="generateChunks" />
        <Button v-if="chunks.length" label="Generate image prompts" icon="pi pi-sparkles" size="small" severity="secondary" :loading="generatingPrompts" :disabled="generating || generatingImages" @click="generateImagePrompts" />
        <Button v-if="chunks.length" label="Generate images" icon="pi pi-images" size="small" severity="secondary" :loading="generatingImages" :disabled="generating || generatingPrompts || retryingImages || assembling" @click="generateImages" />
        <Button v-if="chunks.length" label="Retry failed images" icon="pi pi-refresh" size="small" severity="secondary" :loading="retryingImages" :disabled="generating || generatingPrompts || generatingImages || assembling" @click="retryFailedImages" />
        <Button v-if="chunks.length" label="Assemble video" icon="pi pi-video" size="small" :loading="assembling" :disabled="generating || generatingPrompts || generatingImages || retryingImages" @click="assembleVideo" />
      </div>
    </div>

    <p v-if="!chunks.length" class="empty-state">No chunks yet. Generate them from the transcript.</p>

    <div v-else class="chunks-row">
      <div
        v-for="chunk in chunks"
        :key="chunk.id"
        class="chunk-card"
        :class="{ 'chunk-card--expanded': isExpanded(chunk.id) }"
      >
        <!-- Card header — always visible -->
        <div class="chunk-header" @click="toggleExpand(chunk.id)">
          <span class="chunk-index">#{{ Number(chunk.orderingIndex) + 1 }}</span>
          <i :class="isExpanded(chunk.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="chunk-toggle" />
        </div>

        <!-- Collapsed: two preview squares + text -->
        <template v-if="!isExpanded(chunk.id)">
          <div class="previews">
            <div class="preview-square">
              <img
                v-if="chunk.image?.path"
                :src="imageUrl(chunk.image.id)"
                class="preview-img"
                alt="Image"
              />
              <div v-else class="preview-empty">
                <i class="pi pi-image" />
              </div>
            </div>
            <div class="preview-square">
              <video
                v-if="chunk.image?.imageAnimation?.videoPath"
                :src="animationUrl(chunk.image.id)"
                class="preview-video"
                muted
                loop
                autoplay
              />
              <div v-else class="preview-empty">
                <i class="pi pi-video" />
              </div>
            </div>
          </div>
          <p class="chunk-text">{{ chunk.transcriptChunk }}</p>
        </template>

        <!-- Expanded: full editor -->
        <template v-else>
          <!-- Image + Animation row -->
          <div class="media-row">
            <!-- Image section -->
            <div class="expand-section">
              <div class="expand-label-row">
                <span class="expand-label">Image</span>
                <Tag v-if="chunk.image" :value="chunk.image.status" :severity="imageSeverity(chunk.image.status)" />
              </div>
              <div class="media-preview-large">
                <img
                  v-if="chunk.image?.path"
                  :src="imageUrl(chunk.image.id)"
                  class="media-img"
                  alt="Chunk image"
                />
                <div v-else class="media-empty">
                  <i class="pi pi-image" />
                  <span>{{ chunk.image ? chunk.image.status : 'No image' }}</span>
                </div>
              </div>
              <p v-if="chunk.image?.failReason" class="fail-reason">{{ chunk.image.failReason }}</p>
              <div class="upload-row">
                <input
                  :id="`img-input-${chunk.id}`"
                  type="file"
                  accept="image/*"
                  class="hidden-input"
                  @change="uploadImage(chunk, $event)"
                />
                <Button
                  label="Regenerate"
                  icon="pi pi-sparkles"
                  size="small"
                  severity="secondary"
                  :loading="regenerating[chunk.id]"
                  :disabled="!chunk.image || uploading[`img-${chunk.id}`]"
                  @click="regenerateImage(chunk)"
                />
                <Button
                  label="Upload"
                  icon="pi pi-upload"
                  size="small"
                  severity="secondary"
                  :loading="uploading[`img-${chunk.id}`]"
                  :disabled="!chunk.image || regenerating[chunk.id]"
                  @click="triggerFileInput(`img-input-${chunk.id}`)"
                />
                <span v-if="!chunk.image" class="upload-hint">Generate image prompts first</span>
              </div>
            </div>

            <!-- Animation section -->
            <div class="expand-section">
              <span class="expand-label">Animation</span>
              <div class="media-preview-large media-preview-large--video">
                <video
                  v-if="chunk.image?.imageAnimation?.videoPath"
                  :src="animationUrl(chunk.image.id)"
                  class="media-video"
                  controls
                  muted
                  loop
                />
                <div v-else class="media-empty">
                  <i class="pi pi-video" />
                  <span>No animation</span>
                </div>
              </div>
              <div class="upload-row">
                <input
                  :id="`anim-input-${chunk.id}`"
                  type="file"
                  accept="video/*"
                  class="hidden-input"
                  @change="uploadAnimation(chunk, $event)"
                />
                <input
                  :id="`anim-register-input-${chunk.id}`"
                  type="file"
                  accept="video/*"
                  class="hidden-input"
                  @change="registerAnimationFromPicker(chunk, $event)"
                />
                <Button
                  label="Upload"
                  icon="pi pi-upload"
                  size="small"
                  severity="secondary"
                  :loading="uploading[`anim-${chunk.id}`]"
                  :disabled="!chunk.image || registering[chunk.id]"
                  @click="triggerFileInput(`anim-input-${chunk.id}`)"
                />
                <Button
                  label="Register"
                  icon="pi pi-link"
                  size="small"
                  severity="secondary"
                  :loading="registering[chunk.id]"
                  :disabled="!chunk.image || uploading[`anim-${chunk.id}`]"
                  @click="triggerFileInput(`anim-register-input-${chunk.id}`)"
                />
                <span v-if="!chunk.image" class="upload-hint">Generate image prompts first</span>
              </div>
            </div>
          </div>

          <!-- Image prompt -->
          <div v-if="chunk.image" class="expand-section">
            <span class="expand-label">Image prompt</span>
            <Textarea v-model="getDraft(chunk).prompt" rows="3" fluid />
          </div>

          <!-- Effects -->
          <div class="expand-section">
            <span class="expand-label">Effects</span>
            <div class="effects-row">
              <div class="field">
                <label class="field-label">Video effect</label>
                <InputText v-model="getDraft(chunk).videoEffect" placeholder="e.g. zoomin" fluid />
              </div>
              <div class="field">
                <label class="field-label">Outro effect</label>
                <InputText v-model="getDraft(chunk).outroEffect" placeholder="e.g. zoomout" fluid />
              </div>
            </div>
          </div>

          <!-- Transcript text (read-only) -->
          <div class="expand-section">
            <span class="expand-label">Text</span>
            <p class="chunk-text-full">{{ chunk.transcriptChunk }}</p>
          </div>

          <div class="expand-actions">
            <Button
              label="Save"
              icon="pi pi-check"
              size="small"
              :loading="saving[chunk.id]"
              @click="saveChunk(chunk)"
            />
          </div>
        </template>
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

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  font-size: 0.85rem;
  color: #555;
  margin: 0;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  margin: 0;
}

.chunks-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Chunk card ─────────────────────────────────────────────── */
.chunk-card {
  width: 100%;
  background: #1c1c1c;
  border-radius: 8px;
  border: 1px solid #2e2e2e;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
}

.chunk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.chunk-index {
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
}

.chunk-toggle {
  font-size: 0.7rem;
  color: #444;
}

/* ── Collapsed previews ─────────────────────────────────────── */
.previews {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.preview-square {
  width: 120px;
  height: 80px;
  border-radius: 5px;
  overflow: hidden;
  background: #111;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img,
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #333;
  font-size: 1.1rem;
}

.chunk-text {
  font-size: 0.78rem;
  color: #888;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Expanded sections ──────────────────────────────────────── */
.expand-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.expand-label-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fail-reason {
  font-size: 0.75rem;
  color: #f87171;
  margin: 0;
}

.expand-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.media-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.media-row .expand-section {
  flex: 1;
}

.media-preview-large {
  width: 100%;
  aspect-ratio: 3 / 2;
  border-radius: 5px;
  overflow: hidden;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-preview-large--video {
  aspect-ratio: 16 / 9;
}

.media-img,
.media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: #333;
  font-size: 0.75rem;
}

.media-empty i {
  font-size: 1.4rem;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-hint {
  font-size: 0.72rem;
  color: #555;
}

.hidden-input {
  display: none;
}

.effects-row {
  display: flex;
  gap: 0.5rem;
}

.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.75rem;
  color: #666;
}

.chunk-text-full {
  font-size: 0.8rem;
  color: #888;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.expand-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.25rem;
}
</style>
