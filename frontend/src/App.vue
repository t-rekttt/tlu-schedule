<template>
  <div id="app">
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import ScheduleView from './components/ScheduleView/Index.vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

export default {
  name: 'app',
  components: {
    ScheduleView
  }
}
</script>

<style>
  #app {
    padding-top: 30px;
  }
</style>