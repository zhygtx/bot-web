/**
 * 实体类信息模型
 */
import { Attribute } from './Attribute';

export class EntityInfo {
  /**
   * 实体类id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 实体类描述
   * 系统生成默认为空用户可修改
   */
  description = '';

  /**
   * 实体类简写名称
   * 系统生成系统与用户均不可修改
   */
  name = '';

  /**
   * 实体类所属插件版本id
   * 系统生成系统与用户均不可修改
   */
  pluginVersionId = '';

  /**
   * 实体全限定名
   * 系统生成系统与用户均不可修改
   */
  entityName = '';

  /**
   * 实体类属性信息(对象数组)
   * 系统生成系统与用户均不可修改
   */
  attributes = [];

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.attributes && Array.isArray(data.attributes)) {
      this.attributes = data.attributes.map(attr => new Attribute(attr));
    }
  }
}