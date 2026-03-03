/**
 * 插件信息模型
 */
import { PluginVersion } from './PluginVersion';

export class PluginInfo {
  /**
   * 插件id
   * 系统生成系统与用户均不可修改
   */
  id = '';

  /**
   * 插件名称
   * 用户填写用户可以修改
   */
  name = '';

  /**
   * 插件描述
   * 用户填写用户可以修改
   */
  description = '';

  /**
   * 插件作者（即userId）
   * 系统生成系统与用户均不可修改
   */
  authorId = '';

  /**
   * 插件作者名称
   * 系统生成系统与用户均不可修改
   */
  authorName = '';

  /**
   * 最新版本号
   * 系统生成系统与用户均不可修改
   */
  latestVersion = '';

  /**
   * 版本总数
   * 系统生成用户可以修改，用户不可修稿
   */
  versionCount = 0; // 默认版本总数为0

  /**
   * 是否公开
   * 用户填写用户可以修改
   */
  isPublic = false;

  /**
   * 创建时间
   * 系统生成系统与用户均不可修改
   */
  createTime = null;

  /**
   * 更新时间
   * 系统生成用户不可修改系统可修改
   */
  updateTime = null;

  /**
   * 插件版本信息列表
   */
  pluginVersionList = [];

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.pluginVersionList) {
      this.pluginVersionList = data.pluginVersionList.map(version => new PluginVersion(version));
    }
  }
}