<script setup>
import Layout from './components/Layout.vue'
</script>

<template>
  <Layout />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background: var(--app-bg);
  color: var(--app-text);
  font-size: 14px;
  line-height: 1.5;
  transition: background-color 0.3s ease, background 0.3s ease, color 0.3s ease;
}

#app {
  height: 100vh;
}
</style>
