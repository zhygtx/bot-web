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
   * 参数顺序
   * 系统生成
   */
  order = 0;

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

  /**
   * 参数是否允许为 null。
   * 默认不允许，从后端 @ActionParam(nullable=...) 读取。
   * false: 必填参数，必须配置数据映射或默认值
   * true:  可选参数，允许不填
   */
  nullable = false;

  constructor(data = {}) {
    Object.assign(this, data);
  }
}