package com.example.demo.pojo.plugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 实体类信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntityInfo {
    /**
     * 实体类id
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 实体类描述
     * 系统生成默认为空用户可修改
     */
    private String description;

    /**
     * 实体类简写名称
     * 系统生成系统与用户均不可修改
     */
    private String name;

    /**
     * 实体类所属插件版本id
     * 系统生成系统与用户均不可修改
     */
    private String versionId;

    /**
    * 实体全限定名
     * 系统生成系统与用户均不可修改
    */
    private String entityName;

    /**
     * 实体类属性信息(JSON格式)
     * 系统生成系统与用户均不可修改
     */
    private String attributes;
}
