<template>
  <div>
    <div class="row">
      <div class="col-md-4">
        <h5>Chọn học kì</h5>
        <div class="row">
          <div class="col-md-6">
            <b-form-select v-model="selected.drpSemester" :options="options.drpSemester" class="mb-3" />
          </div>
          <div class="col-md-6">
            <button type="button" class="btn btn-default mb-3">Mặc định</button>
          </div>
        </div>
      </div>
    </div>
    <Schedule :schedule="data" v-if="data && data.length"/>
  </div>
</template>

<script>
import Schedule from '../Schedule.vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

export default {
  name: 'ScheduleView',
  components: {
    Schedule
  },
  data() {
    return {
      data: [],
      options: {
      },
      selected: {
        drpSemester: null
      }
    }
  },
  beforeCreate() {
    fetch('/api/tkbOptions')
      .then(res => res.json())
      .then(res => {
        if (res.message === 'Not logged in') window.location = '/login';

        this.options = res.data;

        let selected = {};

        Object.keys(res.data).map(key => {
          let default_value = res.data[key].filter(option => option.selected)[0];

          if (default_value) {
            selected[key] = default_value.value;
          }
        });

        this.selected = selected;
      });
  },
  watch: {
    'selected.drpSemester'(val, old_val) {
      fetch(`/api/tkb?drpSemester=${val}`)
        .then(res => res.json())
        .then(res => {
          this.data = res.data;
        })
        .catch(err => {
          alert(err);
        });
    }
  }
}
</script>

<style>
</style>