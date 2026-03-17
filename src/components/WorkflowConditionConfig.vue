<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElInput, ElSelect, ElOption, ElButton, ElDialog, ElForm, ElFormItem, ElRadioGroup, ElRadio, ElTree } from 'element-plus'
import { Close, Check } from '@element-plus/icons-vue'

// 定义组件属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  node: {
    type: Object,
    default: () => ({})
  }
})

// 定义事件
const emit = defineEmits(['update:visible', 'save'])

// 弹窗标题
const dialogTitle = ref('配置条件')

// 弹窗可见性
const dialogVisible = ref(false)

// 条件对象
const condition = ref(null)

// 计算当前节点是否可以设置条件
const canSetCondition = computed(() => {
  if (!props.node || !props.node.method) return false
  
  const returnType = props.node.method.returnType
  if (!returnType || returnType === 'void') return false
  
  // 只有返回值为布尔类型的节点才能设置条件
  const booleanTypes = ['Boolean', 'boolean']
  if (!booleanTypes.includes(returnType)) return false
  
  return true
})

// 动作枚举
const Action = {
  CONTINUE: 'CONTINUE',
  BREAK: 'BREAK',
  END: 'END'
}

// 动作描述
const actionDescriptions = {
  [Action.CONTINUE]: '继续执行',
  [Action.BREAK]: '结束当前分支',
  [Action.END]: '结束整个工作流'
}

// 初始化条件
const initCondition = () => {
  if (props.node && props.node.condition) {
    condition.value = { ...props.node.condition }
  } else {
    condition.value = {
      id: Date.now().toString(),
      nodeId: props.node.id,
      trueAction: Action.CONTINUE,
      falseAction: Action.CONTINUE
    }
  }
}

// 保存配置
const saveConfig = () => {
  // 验证条件配置
  if (!condition.value) {
    ElMessage.warning('条件配置不能为空')
    return
  }
  
  if (!condition.value.trueAction) {
    ElMessage.warning('请选择返回true时的执行动作')
    return
  }
  
  if (!condition.value.falseAction) {
    ElMessage.warning('请选择返回false时的执行动作')
    return
  }
  
  emit('save', condition.value)
  closeDialog()
}

// 关闭弹窗
const closeDialog = () => {
  emit('update:visible', false)
}

// 监听可见性变化
watch(() => props.visible, (newValue) => {
  dialogVisible.value = newValue
  if (newValue) {
    initCondition()
  }
})

// 监听dialogVisible变化
watch(dialogVisible, (newValue) => {
  emit('update:visible', newValue)
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    @close="closeDialog"
  >
    <div class="condition-config-container">
      <!-- 不允许设置条件的提示 -->
      <div v-if="!canSetCondition" class="cannot-set-condition">
        <el-empty description="当前节点返回值类型不支持设置条件" />
      </div>
      
      <!-- 条件配置内容 -->
      <template v-else>
        <!-- 条件编辑表单 -->
        <div class="condition-edit-form">
          <h3>条件配置</h3>
          <el-form>
            <el-form-item label="返回值为 true 时执行">
              <el-select 
                v-model="condition.trueAction" 
                placeholder="请选择执行动作"
              >
                <el-option label="继续执行" value="CONTINUE" />
                <el-option label="结束当前分支" value="BREAK" />
                <el-option label="结束整个工作流" value="END" />
              </el-select>
            </el-form-item>
            <el-form-item label="返回值为 false 时执行">
              <el-select 
                v-model="condition.falseAction" 
                placeholder="请选择执行动作"
              >
                <el-option label="继续执行" value="CONTINUE" />
                <el-option label="结束当前分支" value="BREAK" />
                <el-option label="结束整个工作流" value="END" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.condition-config-container {
  padding: 20px;
}

.condition-edit-form {
  margin-top: 10px;
}

.condition-edit-form h3 {
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: bold;
}

.cannot-set-condition {
  padding: 40px 0;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>