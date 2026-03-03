/**
 * 插件版本信息模型
 */
import { EntityInfo } from './EntityInfo';
import { MethodClassInfo } from './MethodClassInfo';

export class PluginVersion {
  /**
   * 版本ID（UUID）
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 插件ID
   * 系统生成系统与用户均不可修改
   */
  pluginId = '';

  /**
   * 版本号
   * 用户填写用户可以修改
   */
  version = '';

  /**
   * 插件文件路径
   * 系统生成系统与用户均不可修改
   */
  path = '';

  /**
   * 文件大小
   * 系统生成系统与用户均不可修改
   */
  fileSize = 0;

  /**
   * 文件MD5
   * 系统生成系统与用户均不可修改
   */
  fileMd5 = '';

  /**
   * 创建时间
   * 系统生成系统与用户均不可修改
   */
  createTime = null;

  /**
   * 版本变更说明
   * 用户填写用户可以修改
   */
  changelog = '';

  /**
   * 插件实体类包名
   * 用户填写用户不可修改
   */
  entityPackage = '';

  /**
   * 插件方法类包名
   * 用户填写用户不可修改
   */
  methodPackage = '';

  /**
   * 此版本所兼容的版本（JSON）
   * 用户填写用户可以修改
   */
  compatibleVersion = '';

  /**
   * 插件实体类信息
   */
  entityInfoList = [];

  /**
   * 插件方法类信息列表
   */
  methodClassInfoList = [];

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.entityInfoList) {
      this.entityInfoList = data.entityInfoList.map(entity => new EntityInfo(entity));
    }
    if (data.methodClassInfoList) {
      this.methodClassInfoList = data.methodClassInfoList.map(methodClass => new MethodClassInfo(methodClass));
    }
  }
}