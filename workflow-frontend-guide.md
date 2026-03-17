# 工作流前端实现指南

## 1. 概述

本文档旨在指导前端开发人员实现工作流相关功能，包括工作流的创建、编辑、执行和管理。文档详细描述了前端需要处理的数据结构、API接口、实现建议和注意事项，帮助前端开发人员快速上手并正确实现相关功能。

## 2. 核心数据结构

### 2.1 工作流信息（WorkflowInfo）

```json
{
  "id": "string",                // 工作流ID
  "name": "string",              // 工作流名称
  "description": "string",       // 工作流描述
  "nodes": [Node],               // 工作流节点列表
  "conditions": [Condition],     // 工作流条件列表
  "createTime": "datetime",      // 创建时间（后端返回）
  "updateTime": "datetime"       // 更新时间（后端返回）
}
```

### 2.2 节点（Node）

```json
{
  "id": "string",                // 节点ID
  "x": "integer",                // 节点位置（水平坐标）
  "y": "integer",                // 节点位置（垂直坐标）
  "pluginId": "string",          // 插件ID
  "pluginVersionId": "string",   // 插件版本ID
  "methodClassId": "string",     // 方法类ID
  "methodId": "string",          // 方法ID
  "dataMaps": [DataMap],         // 数据映射列表
  "preNodeId": ["string"],       // 前置节点ID列表
  "nextNodeId": ["string"],      // 后置节点ID列表
  "nodeDefaults": [NodeDefaults] // 节点默认值列表
}
```

### 2.3 数据映射（DataMap）

```json
{
  "id": "string",                // 映射关系ID
  "sourceNodeId": "string",      // 源数据所属节点ID
  "sourcePath": "string",        // 源数据字段路径（支持嵌套）
  "targetParamName": "string",   // 目标参数名称
  "paramIndex": "integer",       // 方法的第几个参数
  "targetPath": "string",        // 目标参数字段路径（支持嵌套）
  "sourceType": "string",        // 源数据字段类型
  "targetType": "string"         // 目标字段类型
}
```

### 2.4 节点默认值（NodeDefaults）

```json
{
  "id": "string",                // 默认值ID
  "paramIndex": "integer",       // 方法的第几个参数
  "paramName": "string",         // 方法参数名称
  "fieldPath": "string",         // 字段路径（支持嵌套）
  "defaultValue": "string",      // 默认值
  "defaultValueType": "enum"     // 默认值类型（String, Integer, Double, Boolean）
}
```

### 2.5 条件（Condition）

```json
{
  "id": "string",                // 条件ID
  "nodeId": "string",            // 所判断的数据产生者节点ID
  "fieldName": "string",         // 判断的数据字段名称
  "presetContent": "string",     // 预设内容
  "contentType": "enum",         // 预设内容类型（STRING, NUMBER, BOOLEAN）
  "action": "enum",              // 满足条件时执行动作（CONTINUE, BREAK, END）
  "elseAction": "enum",          // 不满足条件时执行动作
  "operator": "enum"             // 判断条件操作符
}
```



### 4.2 数据映射配置

#### 4.2.1 源数据配置
- **源节点选择**：选择提供数据的源节点
- **路径配置**：输入源数据的字段路径（支持嵌套，如 `value.user.id`）
- **类型选择**：选择源数据的类型

#### 4.2.2 目标参数配置
- **参数选择**：选择目标方法的参数
- **索引设置**：设置参数在方法签名中的索引位置
- **路径配置**：输入目标参数的字段路径（支持嵌套，如 `user.address.street`）
- **类型选择**：选择目标数据的类型

### 4.3 默认值配置

#### 4.3.1 参数选择
- **参数索引**：选择方法的参数索引
- **参数名称**：输入参数的名称

#### 4.3.2 字段配置
- **字段路径**：输入参数的字段路径（支持嵌套）

#### 4.3.3 默认值设置
- **值输入**：输入默认值
- **类型选择**：选择默认值的类型（String、Integer、Double、Boolean、Long）

### 4.4 工作流执行

#### 4.4.1 执行配置
- **工作流选择**：选择要执行的工作流
- **输入参数**：输入初始执行参数

#### 4.4.2 执行监控
- **执行状态**：显示工作流执行的实时状态
- **节点状态**：显示每个节点的执行状态
- **执行日志**：显示执行过程中的日志信息

#### 4.4.3 结果展示
- **执行结果**：展示工作流的执行结果
- **节点结果**：展示每个节点的执行结果
- **错误信息**：展示执行过程中的错误信息

## 5. 注意事项

### 5.1 数据映射注意事项

1. **路径格式**：
   - 使用 `value` 表示返回值本身
   - 使用 `value.xxx.xxx` 表示嵌套属性
   - 示例：`value`、`value.id`、`value.user.address.street`

2. **参数定位**：
   - 建议同时提供 `paramIndex` 和 `targetParamName`
   - `paramIndex` 优先级高于 `targetParamName`

3. **类型匹配**：
   - 确保源数据类型与目标数据类型兼容
   - 支持的类型：String、Integer、Double、Boolean、Long

### 5.2 默认值设置注意事项

1. **字段路径**：
   - 与数据映射路径格式相同
   - 示例：`user`、`user.id`、`user.address.street`

2. **默认值类型**：
   - 必须与 `defaultValueType` 匹配
   - 支持：String、Integer、Double、Boolean

3. **优先级**：
   - 数据映射的值优先级高于默认值
   - 只有当映射值为 null 时才使用默认值

### 5.3 条件判断注意事项

1. **字段名称**：
   - 对于输入节点，直接使用字段名
   - 对于其他节点，使用 `value` 或 `value.xxx` 格式

2. **操作符使用**：
   - 根据 `contentType` 选择合适的操作符
   - 字符串：EQUALS、NOT_EQUALS、CONTAINS、NOT_CONTAINS、REGEX
   - 数字：EQUALS、NOT_EQUALS、GREATER_THAN、GREATER_THAN_OR_EQUALS、LESS_THAN、LESS_THAN_OR_EQUALS
   - 布尔值：EQUALS、NOT_EQUALS
   - 通用：IS_NULL、IS_NOT_NULL

3. **动作配置**：
   - CONTINUE：继续执行
   - BREAK：结束当前分支
   - END：结束整个工作流

## 7. 示例

### 7.1 简单数据映射示例

**场景**：将节点A的返回值直接映射到节点B的第一个参数

```json
{
  "dataMaps": [
    {
      "sourceNodeId": "nodeA",
      "sourcePath": "value",
      "targetParamName": "param1",
      "paramIndex": 0,
      "targetPath": "param1"
    }
  ]
}
```

### 7.2 嵌套属性映射示例

**场景**：将节点A返回值的 user.id 映射到节点B参数的 user.id

```json
{
  "dataMaps": [
    {
      "sourceNodeId": "nodeA",
      "sourcePath": "value.user.id",
      "targetParamName": "user",
      "paramIndex": 0,
      "targetPath": "user.id"
    }
  ]
}
```

### 7.3 默认值设置示例

**场景**：为节点的第二个参数设置默认值

```json
{
  "nodeDefaults": [
    {
      "paramIndex": 1,
      "paramName": "name",
      "fieldPath": "name",
      "defaultValue": "default name",
      "defaultValueType": "String"
    }
  ]
}
```

### 7.4 条件判断示例

**场景**：当节点A的返回值等于 "success" 时继续执行，否则结束分支

```json
{
  "conditions": [
    {
      "nodeId": "nodeA",
      "fieldName": "value",
      "presetContent": "success",
      "contentType": "STRING",
      "action": "CONTINUE",
      "elseAction": "BREAK",
      "operator": "EQUALS"
    }
  ]
}
```