<script setup>
const props = defineProps({
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50] },
  total: { type: Number, default: 0 },
  layout: { type: String, default: 'prev, pager, next' }
})

const emit = defineEmits([
  'update:currentPage',
  'update:pageSize',
  'current-change',
  'size-change'
])

const handleCurrentChange = (page) => {
  emit('update:currentPage', page)
  emit('current-change', page)
}

const handleSizeChange = (size) => {
  emit('update:pageSize', size)
  emit('size-change', size)
}
</script>

<template>
  <div class="app-pagination" v-if="total > 0">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :layout="layout"
      :total="total"
      :small="false"
      :pager-count="5"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<style scoped>
.app-pagination {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 12px 0;
  margin-top: 18px;
  color: var(--app-text);
}

.app-pagination :deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-button-bg-color: var(--app-surface-raised);
  --el-pagination-hover-color: var(--app-primary);
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 5px;
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-card);
  background: var(--app-surface-raised-soft);
  box-shadow: var(--app-surface-shadow);
}

.app-pagination :deep(.btn-prev),
.app-pagination :deep(.btn-next),
.app-pagination :deep(.el-pager li) {
  min-width: 32px;
  height: 32px;
  border-radius: var(--app-radius-control);
  background: var(--app-panel-muted);
  color: var(--app-text-soft);
  border: 1px solid transparent;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.app-pagination :deep(.btn-prev:hover),
.app-pagination :deep(.btn-next:hover),
.app-pagination :deep(.el-pager li:hover:not(.is-disabled)) {
  background: var(--app-primary-soft);
  color: var(--app-primary);
  border-color: var(--app-primary-border);
}

.app-pagination :deep(.el-pager li.is-active),
.app-pagination :deep(.el-pager li.active) {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
}

.app-pagination :deep(.btn-prev:disabled),
.app-pagination :deep(.btn-next:disabled),
.app-pagination :deep(.el-pager li.is-disabled) {
  background: var(--app-panel-muted);
  color: var(--app-text-disabled);
  opacity: 0.65;
}

.app-pagination :deep(.el-pagination__total),
.app-pagination :deep(.el-pagination__jump) {
  color: var(--app-text-muted);
}

.app-pagination :deep(.el-input__wrapper),
.app-pagination :deep(.el-select__wrapper) {
  min-height: 32px;
  border-radius: var(--app-radius-control);
  background: var(--app-surface-raised);
  box-shadow: 0 0 0 1px var(--app-border-soft) inset;
}

@media (max-width: 767px) {
  .app-pagination {
    margin-top: 10px;
    padding: 8px 0;
    overflow-x: hidden;
  }

  .app-pagination :deep(.el-pagination) {
    gap: 4px;
    padding: 4px;
    box-shadow: none;
  }

  .app-pagination :deep(.btn-prev),
  .app-pagination :deep(.btn-next),
  .app-pagination :deep(.el-pager li) {
    min-width: 30px;
    height: 30px;
  }
}
</style>
