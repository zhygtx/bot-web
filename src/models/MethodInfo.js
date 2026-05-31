/**
 * 方法信息模型
 */
import { ParameterInfo } from './ParameterInfo';

export class MethodInfo {
  /**
   * 方法id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 方法描述
   * 系统生成默认为空用户可修改
   */
  description = '';

  /**
   * 方法所属方法类ID
   * 系统生成系统与用户均不可修改
   */
  methodClassId = '';

  /**
   * 方法名
   * 系统生成系统与用户均不可修改
   */
  name = '';

  /**
   * 方法参数列表
   */
  parameters = [];

  /**
   * 方法返回值类型
   * 系统生成系统与用户均不可修改
   */
  returnType = '';

  /**
   * 方法返回值描述
   * 系统生成默认为空用户可修改
   */
  returnDescription = '';

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.parameters) {
      this.parameters = data.parameters.map(param => new ParameterInfo(param));
    }
  }
}