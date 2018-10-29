import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import BootstrapVue from 'bootstrap-vue'
import HelloWorld from './components/HelloWorld'
import Login from './components/Login'
import ScheduleView from './components/ScheduleView/Index'

Vue.use(VueRouter);
Vue.use(BootstrapVue);

Vue.config.productionTip = false

const routes = [
  { path: '/hello', component: HelloWorld },
  { path: '/login', component: Login },
  { path: '/schedule', component: ScheduleView }
];

const router = new VueRouter({
  routes,
  mode: 'history'
});

new Vue({
  render: h => h(App),
  router
}).$mount('#app')
