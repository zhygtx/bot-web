package com.example.demo.pojo.plugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 方法信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MethodInfo {

    /**
     * 方法id
     * 系统生成系统与用户均不可修改
     */
    private String id;

    /**
     * 方法描述
     * 系统生成默认为空用户可修改
     */
    private String description;

    /**
     * 方法所属方法类ID
     * 系统生成系统与用户均不可修改
     */
    private String methodClassId;

    /**
     * 方法名
     * 系统生成系统与用户均不可修改
     */
    private String name;

    /**
     * 方法参数列表（JSON格式）
     */
    private List<ParameterInfo> parameters;

    /**
     * 方法返回值类型
     * 系统生成系统与用户均不可修改
     */
    private String returnType;
}
