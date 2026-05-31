/**
 * 属性信息模型
 */
export class Attribute {
  /**
   * 属性id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 属性描述
   * 系统生成默认为空用户可修改
   */
  description = '';

  /**
   * 属性所属实体类id
   * 系统生成系统与用户均不可修改
   */
  entityInfoId = '';

  /**
   * 属性类型
   * 系统生成系统与用户均不可修改
   */
  type = '';

  /**
   * 属性名称
   * 系统生成系统与用户均不可修改
   */
  name = '';

  constructor(data = {}) {
    Object.assign(this, data);
  }
}
