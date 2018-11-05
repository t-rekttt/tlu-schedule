<template>
  <div>
    <div class="row">
      <div class="col-md-2">
        <h5>Chọn học kì</h5>
        <div class="row">
          <div class="col-md-12">
            <b-form-select v-model="selected.drpSemester" :options="options.drpSemester" class="mb-3" />
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <h5>Chế độ xem lịch</h5>
        <b-form-group class="mb-3 view-mode">
          <b-form-checkbox-group button-variant="primary" buttons v-model="selected.view_mode" name="view_mode" :options="checkboxes.view_mode.options">
          </b-form-checkbox-group>
        </b-form-group>
      </div>
      <div class="col-md-5">
        <h5>Code <small>(Paste vào chatbot để nhập TKB)</small></h5>
        <div class="input-group">
          <b-form-input type="text" :value="data.code" disabled>
          </b-form-input>
          <button class="btn btn-primary" @click="copyToClipboard(data.code)">Copy</button>
        </div>
      </div>
    </div>
    <div class="schedule">
      <div v-if="loading">
        <h3 class="text-center text-secondary">Đang tải</h3>
      </div>
      <Schedule v-else :schedule="data.schedule" :filter="selected.view_mode"/>
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
      data: this.$store.state.data,
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
  mounted() {
    if (!this.data || !Object.keys(this.data).length) this.loading = true;

    fetch('/api/tkbOptions', { credentials: 'include' })
      .then(res => res.json())
      .then(res => {
        this.loading = false;
        if (res.message === 'Not logged in') {
          if (!this.data) {
            window.location = '/login';
          }
          
          return;          
        }

        this.options = res.data;

        let selected = {};

        Object.keys(res.data).map(key => {
          let default_value = res.data[key].filter(option => option.selected)[0];

          if (default_value) {
            selected[key] = default_value.value;
          }
        });

        this.selected = {...this.selected, ...selected, ...this.$store.state.selected};
      });
  },
  watch: {
    'selected.drpSemester'(val, old_val) {
      this.loading = true;

      fetch(`/api/tkb?drpSemester=${val}`, { credentials: 'include' })
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
    },
    data: {
      handler(val) {
        this.$store.commit('updateData', val);
      }
    }
  },
  methods: {
    copyToClipboard(str) {
      const el = document.createElement('textarea');
      el.value = str;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
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