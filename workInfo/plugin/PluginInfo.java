package com.example.demo.pojo.plugin;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 插件信息
 * 上传新文件时只能作为新版本，不能替换已有的插件文件信息
 * 用户只能修改已经标注为用户可修改内容的字段
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PluginInfo {

    /**
     * 插件id
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 插件名称
     * 用户填写用户可以修改
     */
    private String name;

    /**
     * 插件描述
     * 用户填写用户可以修改
     */
    private String description;

    /**
     * 插件作者（即userId）
     * 系统生成系统与用户均不可修改
     */
    private String authorId;

    /**
     * 插件作者名称
     * 系统生成系统与用户均不可修改
     */
    private String authorName;

    /**
     * 最新版本号
     * 系统生成系统与用户均不可修改
     */
    private String latestVersion;

    /**
     * 版本总数
     * 系统生成用户可以修改，用户不可修稿
     */
    private Integer versionCount = 0; // 默认版本总数为0

    /**
     * 是否公开
     * 用户填写用户可以修改
     */
    private Boolean isPublic;

    /**
     * 创建时间
     * 系统生成系统与用户均不可修改
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /**
     * 更新时间
     * 系统生成用户不可修改系统可修改
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

    /**
     * 插件版本信息列表
     */
    private List<PluginVersion> pluginVersionList;

}
