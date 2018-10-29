<template>
  <div>
    <div class="row">
      <div class="col-md-4">
        <h5>Chọn học kì</h5>
        <div class="row">
          <div class="col-md-6">
            <b-form-select v-model="selected.drpSemester" :options="options.drpSemester" class="mb-3" />
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <h5>Chế độ xem lịch</h5>
        <b-form-group class="mb-3 view-mode">
          <b-form-checkbox-group buttons v-model="selected.view_mode" name="view_mode" :options="checkboxes.view_mode.options">
          </b-form-checkbox-group>
        </b-form-group>
      </div>
    </div>
    <div class="schedule">
      <div v-if="loading">
        <h3 class="text-center text-secondary">Đang tải</h3>
      </div>
      <Schedule v-else :schedule="data" :filter="selected.view_mode"/>
    </div>
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
        view_mode: ['coming']
      },
      loading: false,
      checkboxes: {
        view_mode: {
          options: [
            {text: 'Đã qua', value: 'past'}, 
            {text: 'Sắp tới', value: 'coming'}
          ]
        }
      }
    }
  },
  beforeCreate() {
    this.loading = true;

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

        this.selected = {...this.selected, ...selected, ...this.$store.state.selected};
        this.loading = false;
      });
  },
  watch: {
    'selected.drpSemester'(val, old_val) {
      this.loading = true;

      fetch(`/api/tkb?drpSemester=${val}`)
        .then(res => res.json())
        .then(res => {
          this.data = res.data;
          this.loading = false;
        })
        .catch(err => {
          alert(err);
        });
    },
    selected: {
      handler(val) {
        this.$store.commit('updateSelected', val);
      },
      deep: true
    }
  }
}
</script>

<style>
  .schedule {
    margin-top: 30px;
  }

  .custom-control-label::before {
    transform: scale(1.6);
  }

  .custom-control-label::after {
    transform: scale(1.6);
  }

  .view-mode .focus {
    outline: none !important;
    box-shadow: none !important;
  }
</style>