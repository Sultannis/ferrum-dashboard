<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

interface Channel {
  id: number
  name: string
  niche: string | null
  context: string | null
  description: string | null
  keywords: string | null
  profileImagePath: string | null
  bannerImagePath: string | null
  createdAt: string
}

const channels = ref<Channel[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// ── Create modal ────────────────────────────────────────────────────
const createOpen = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', niche: '', context: '' })
const createError = ref<string | null>(null)

function openCreate() {
  createForm.value = { name: '', niche: '', context: '' }
  createError.value = null
  createOpen.value = true
}

async function submitCreate() {
  if (!createForm.value.name.trim()) {
    createError.value = 'Name is required'
    return
  }
  creating.value = true
  createError.value = null
  try {
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    createOpen.value = false
    await loadChannels()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Failed to create channel'
  } finally {
    creating.value = false
  }
}

// ── Edit modal ───────────────────────────────────────────────────────
const editOpen = ref(false)
const editForm = ref<Omit<Channel, 'createdAt'>>({
  id: 0,
  name: '',
  niche: null,
  context: null,
  description: null,
  keywords: null,
  profileImagePath: null,
  bannerImagePath: null,
})
const saving = ref(false)
const editError = ref<string | null>(null)
const generating = ref<string | null>(null)
const imageCacheBust = ref(Date.now())

function openEdit(channel: Channel) {
  editForm.value = { ...channel }
  editError.value = null
  generating.value = null
  editOpen.value = true
}

async function submitUpdate() {
  saving.value = true
  editError.value = null
  try {
    const { id, profileImagePath, bannerImagePath, ...body } = editForm.value
    const res = await fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const updated: Channel = await res.json()
    const idx = channels.value.findIndex((c) => c.id === id)
    if (idx !== -1) channels.value[idx] = updated
    editOpen.value = false
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Failed to save changes'
  } finally {
    saving.value = false
  }
}

async function generate(action: 'generate-keywords' | 'generate-description' | 'generate-profile-image' | 'generate-banner') {
  generating.value = action
  editError.value = null
  try {
    const res = await fetch(`/api/channels/${editForm.value.id}/${action}`, { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const updated: Channel = await res.json()
    editForm.value = { ...updated }
    imageCacheBust.value = Date.now()
    const idx = channels.value.findIndex((c) => c.id === updated.id)
    if (idx !== -1) channels.value[idx] = updated
  } catch (e) {
    editError.value = e instanceof Error ? e.message : `Failed to ${action}`
  } finally {
    generating.value = null
  }
}

// ── Data ─────────────────────────────────────────────────────────────
async function loadChannels() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/channels')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    channels.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load channels'
  } finally {
    loading.value = false
  }
}

onMounted(loadChannels)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Channels</h1>
      <Button label="New Channel" icon="pi pi-plus" size="small" @click="openCreate" />
    </div>

    <p v-if="error" class="fetch-error">{{ error }}</p>

    <DataTable
      v-else
      :value="channels"
      :loading="loading"
      striped-rows
      row-hover
      class="channels-table"
      @row-click="openEdit($event.data)"
    >
      <Column field="id" header="ID" style="width: 60px" />
      <Column field="name" header="Name" />
      <Column field="niche" header="Niche" style="width: 160px" />
      <Column field="description" header="Description">
        <template #body="{ data }">
          <span class="description-cell">{{ data.description }}</span>
        </template>
      </Column>
      <Column field="createdAt" header="Created" style="width: 140px">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>

    <!-- Create modal -->
    <Dialog
      v-model:visible="createOpen"
      header="New Channel"
      :style="{ width: '480px' }"
      modal
      :draggable="false"
    >
      <form class="form" @submit.prevent="submitCreate">
        <div class="field">
          <label>Name <span class="required">*</span></label>
          <InputText v-model="createForm.name" placeholder="e.g. Cognition Unlocked" fluid />
        </div>
        <div class="field">
          <label>Niche</label>
          <InputText v-model="createForm.niche" placeholder="e.g. Psychology" fluid />
        </div>
        <div class="field">
          <label>Context</label>
          <Textarea v-model="createForm.context" placeholder="Describe the channel's purpose..." rows="4" fluid />
        </div>
        <p v-if="createError" class="form-error">{{ createError }}</p>
        <div class="form-actions">
          <Button label="Cancel" severity="secondary" text @click="createOpen = false" />
          <Button type="submit" label="Create" icon="pi pi-check" :loading="creating" />
        </div>
      </form>
    </Dialog>

    <!-- Edit modal -->
    <Dialog
      v-model:visible="editOpen"
      :header="editForm.name"
      :style="{ width: '620px' }"
      modal
      :draggable="false"
    >
      <form class="form" @submit.prevent="submitUpdate">
        <div class="field-row">
          <div class="field">
            <label>Name</label>
            <InputText v-model="editForm.name" fluid />
          </div>
          <div class="field">
            <label>Niche</label>
            <InputText v-model="editForm.niche!" fluid />
          </div>
        </div>

        <div class="field">
          <label>Context</label>
          <Textarea v-model="editForm.context!" rows="3" fluid />
        </div>

        <div class="field">
          <div class="field-label-row">
            <label>Description</label>
            <Button
              label="Generate"
              icon="pi pi-sparkles"
              size="small"
              text
              :loading="generating === 'generate-description'"
              :disabled="!!generating"
              @click.prevent="generate('generate-description')"
            />
          </div>
          <Textarea v-model="editForm.description!" rows="4" fluid />
        </div>

        <div class="field">
          <div class="field-label-row">
            <label>Keywords</label>
            <Button
              label="Generate"
              icon="pi pi-sparkles"
              size="small"
              text
              :loading="generating === 'generate-keywords'"
              :disabled="!!generating"
              @click.prevent="generate('generate-keywords')"
            />
          </div>
          <Textarea v-model="editForm.keywords!" rows="3" fluid />
        </div>

        <div class="generate-assets">
          <div class="asset-row">
            <div class="asset-block">
              <div class="field-label-row">
                <span class="assets-label">Profile Image</span>
                <Button
                  label="Generate"
                  icon="pi pi-sparkles"
                  size="small"
                  text
                  :loading="generating === 'generate-profile-image'"
                  :disabled="!!generating"
                  @click.prevent="generate('generate-profile-image')"
                />
              </div>
              <div class="asset-preview profile-preview">
                <img
                  v-if="editForm.profileImagePath"
                  :src="`/api/channels/${editForm.id}/profile-image?t=${imageCacheBust}`"
                  alt="Profile image"
                  class="profile-img"
                />
                <span v-else class="asset-empty">Not generated</span>
              </div>
            </div>

            <div class="asset-block asset-block--banner">
              <div class="field-label-row">
                <span class="assets-label">Banner</span>
                <Button
                  label="Generate"
                  icon="pi pi-sparkles"
                  size="small"
                  text
                  :loading="generating === 'generate-banner'"
                  :disabled="!!generating"
                  @click.prevent="generate('generate-banner')"
                />
              </div>
              <div class="asset-preview banner-preview">
                <img
                  v-if="editForm.bannerImagePath"
                  :src="`/api/channels/${editForm.id}/banner?t=${imageCacheBust}`"
                  alt="Banner"
                  class="banner-img"
                />
                <span v-else class="asset-empty">Not generated</span>
              </div>
            </div>
          </div>
        </div>

        <p v-if="editError" class="form-error">{{ editError }}</p>

        <div class="form-actions">
          <Button label="Cancel" severity="secondary" text @click="editOpen = false" />
          <Button type="submit" label="Save" icon="pi pi-check" :loading="saving" :disabled="!!generating" />
        </div>
      </form>
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

:deep(.channels-table .p-datatable-tbody > tr) {
  cursor: pointer;
}

.description-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.5;
}

/* Form shared */
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
  flex: 1;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-surface-500);
}

.field-row {
  display: flex;
  gap: 1rem;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.generate-assets {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
}

.asset-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.asset-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.asset-block--banner {
  flex: 1;
}

.assets-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-surface-500);
}

.asset-preview {
  border-radius: 6px;
  overflow: hidden;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.banner-preview {
  height: 80px;
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-empty {
  font-size: 0.78rem;
  color: var(--p-surface-400);
}

.required {
  color: #f87171;
}

.form-error {
  color: #f87171;
  font-size: 0.85rem;
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
</style>
