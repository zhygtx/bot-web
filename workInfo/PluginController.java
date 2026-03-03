package com.example.demo.controller;

import com.example.demo.pojo.Result;
import com.example.demo.pojo.plugin.PluginInfo;
import com.example.demo.service.PluginService;
import com.example.demo.util.AuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/plugin")
public class PluginController {

    private final PluginService pluginService;
    private final AuthUtil authUtil;

    public PluginController(PluginService pluginService, AuthUtil authUtil) {
        this.pluginService = pluginService;
        this.authUtil = authUtil;
    }

    @PostMapping
    public Result<?> add(HttpServletRequest request, PluginInfo pluginInfo, MultipartFile file) {
        String userId = authUtil.getCurrentUserId(request);
        String userName = authUtil.getCurrentUserName(request);
        pluginInfo.setAuthorName(userName);
        pluginInfo.setAuthorId(userId);
        return pluginService.add(pluginInfo, file);
    }

    @GetMapping("/findByAuthorId")
    public Result<?> findByAuthorId(HttpServletRequest request,
                                    @RequestParam(required = false,defaultValue = "1") int pageNum,
                                    @RequestParam(required = false,defaultValue = "12") int pageSize) {
        String userId = authUtil.getCurrentUserId(request);
        return Result.success(pluginService.findByAuthorId(userId, pageNum, pageSize));
    }
}
