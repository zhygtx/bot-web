package com.example.demo.pojo.plugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 方法类信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MethodClassInfo {
    /**
     * 方法类id
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 类描述
     * 系统生成默认为空用户可修改
     */
    private String description;

    /**
     * 方法类版本id
     * 系统生成系统与用户均不可修改
     */
    private String versionId;

    /**
     * 类全限定名
     * 系统生成系统与用户均不可修改
     */
    private String className;

    /**
     * 简单类名
     * 系统生成系统与用户均不可修改
     */
    private String simpleClassName;

    /**
     * 包名
     * 系统生成系统与用户均不可修改
     */
    private String packageName;

    /**
     * 该类中的方法列表
     */
    private List<MethodInfo> methods;
}