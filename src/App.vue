<script setup lang="ts">
import TopBar from "./components/TopBar.vue";
import GridEngine from "./components/GridEngine.vue";
</script>

<template>
  <div class="moduladesk">
    <TopBar />
    <GridEngine />
  </div>
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
  background: transparent;
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}

.moduladesk {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: #e0e0e0;
}
</style>
