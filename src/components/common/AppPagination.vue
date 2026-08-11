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
