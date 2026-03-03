package com.example.demo.pojo.plugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 参数信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParameterInfo {

    /**
     * 参数id
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 参数描述
     * 系统生成默认为空用户可修改
     */
    private String description;

    /**
     * 参数所属方法id
     * 系统生成系统与用户均不可修改
     */
    private String methodId;

    /**
     * 参数名
     * 系统生成系统与用户均不可修改
     */
    private String name;

    /**
     * 参数类型
     * 系统生成系统与用户均不可修改
     */
    private String type;

}
