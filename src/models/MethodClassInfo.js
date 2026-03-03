/**
 * 方法类信息模型
 */
import { MethodInfo } from './MethodInfo';

export class MethodClassInfo {
  /**
   * 方法类id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 类描述
   * 系统生成默认为空用户可修改
   */
  description = '';

  /**
   * 方法类版本id
   * 系统生成系统与用户均不可修改
   */
  pluginVersionId = '';

  /**
   * 类全限定名
   * 系统生成系统与用户均不可修改
   */
  className = '';

  /**
   * 简单类名
   * 系统生成系统与用户均不可修改
   */
  simpleClassName = '';

  /**
   * 包名
   * 系统生成系统与用户均不可修改
   */
  packageName = '';

  /**
   * 该类中的方法列表
   */
  methods = [];

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.methods) {
      this.methods = data.methods.map(method => new MethodInfo(method));
    }
  }
}