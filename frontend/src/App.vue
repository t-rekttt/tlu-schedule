<template>
  <div id="app">
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
  (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/messenger.Extensions.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'Messenger'));
  
  import ScheduleView from './components/ScheduleView/Index.vue'
  import 'bootstrap/dist/css/bootstrap.css'
  import 'bootstrap-vue/dist/bootstrap-vue.css'
  import 'whatwg-fetch'

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

  body {
    background-color: #f5f5f5;
  }
</style>