package com.example.demo.pojo.plugin;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 插件版本信息
 * 上传新文件时作为新版本
 * 用户只能修改已经标注为用户可修改内容的字段
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PluginVersion {

    /**
     * 版本ID（UUID）
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 插件ID
     * 系统生成系统与用户均不可修改
     */
    private String pluginId;

    /**
     * 版本号
     * 用户填写用户可以修改
     */
    private String version;

    /**
     * 插件文件路径
     * 系统生成系统与用户均不可修改
     */
    private String path;

    /**
     * 文件大小
     * 系统生成系统与用户均不可修改
     */
    private Long fileSize;

    /**
     * 文件MD5
     * 系统生成系统与用户均不可修改
     */
    private String fileMd5;

    /**
     * 创建时间
     * 系统生成系统与用户均不可修改
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /**
     * 版本变更说明
     * 用户填写用户可以修改
     */
    private String changelog;

    /**
     * 插件实体类包名
     * 用户填写用户不可修改
     */
    private String entityPackage;

    /**
     * 插件方法类包名
     * 用户填写用户不可修改
     */
    private String methodPackage;

    /**
     * 此版本所兼容的版本（JSON）
     * 用户填写用户可以修改
     */
    private String compatibleVersion;

    /**
     * 插件实体类信息
     */
    private List<EntityInfo> entityInfoList;

    /**
     * 插件方法类信息列表
     */
    private List<MethodClassInfo> methodClassInfoList;
}
