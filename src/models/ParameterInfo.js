/**
 * 参数信息模型
 */
export class ParameterInfo {
  /**
   * 参数id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 参数描述
   * 系统生成默认为空用户可修改
   */
  description = '';

  /**
   * 参数所属方法id
   * 系统生成系统与用户均不可修改
   */
  methodId = '';

  /**
   * 参数名
   * 系统生成系统与用户均不可修改
   */
  name = '';

  /**
   * 参数类型
   * 系统生成系统与用户均不可修改
   */
  type = '';

  constructor(data = {}) {
    Object.assign(this, data);
  }
}