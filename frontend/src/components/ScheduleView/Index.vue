<template>
  <div>
    <div class="row">
      <div class="col-md-12">
        <div class="float-right">
          <button class="btn btn-danger" @click="logout">Đăng xuất</button>
        </div>
      </div>
    </div>
    <div class="row text-center">
      <div class="col-md-2">
        <h5>Chọn học kì</h5>
        <div class="row">
          <div class="col-md-12">
            <b-form-select v-model="selected.drpSemester" :options="options.drpSemester" class="mb-3" />
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <h5>Chế độ xem lịch</h5>
        <b-form-group class="mb-3 view-mode">
          <b-form-checkbox-group button-variant="primary" buttons v-model="selected.view_mode" name="view_mode" :options="checkboxes.view_mode.options">
          </b-form-checkbox-group>
        </b-form-group>
      </div>
      <div class="col-md-5" v-if="getQueryString().messenger_user_id">
        <h5>Cập nhật TKB vào chatbot</h5>
        <button class="btn btn-primary" @click="updateFromMessenger" v-show="data.code">Cập nhật</button>
      </div>
      <div class="col-md-5" v-else>
        <h5>Code <small>(Paste vào chatbot để nhập TKB)</small></h5>
        <div class="input-group">
          <b-form-input type="text" :value="data.code" readonly id="code">
          </b-form-input>
          <button class="btn btn-primary" data-clipboard-target="#code">Copy</button>
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
  import ClipboardJS from 'clipboard'
  var clipboard = new ClipboardJS('.btn');

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
        selected: this.$store.state.selected,
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
    created() {
      let isDataExists = this.data && Object.keys(this.data).length;

      if (!isDataExists) this.loading = true;

      fetch('/api/tkbOptions', { credentials: 'include' })
        .then(res => res.json())
        .then(res => {
          this.loading = false;

          if (res.message === 'Not logged in') {
            if (!isDataExists || this.getQueryString().messenger_user_id) {
              return this.$router.push({ path: '/login', query: this.getQueryString() });
            }
            
            this.options = [this.$store.state.selected];
            this.data.code = 'Hãy đăng nhập lại để cập nhật code';
            return;          
          } else {
            this.options = res.data;

            let selected = {};

            Object.keys(res.data).map(key => {
              let default_value = res.data[key].filter(option => option.selected)[0];

              if (default_value) {
                selected[key] = default_value.value;
              }
            });

            if (!this.selected || !this.selected.drpSemester) this.selected = {...this.selected, ...selected, ...this.$store.state.selected};
          }
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
            console.log(err);
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
      },
      getQueryString() {
        let qs = {};

        let query = new URL(window.location).searchParams;

        for (let q of query) {
          qs[q[0]] = q[1];
        }

        return qs;
      },
      logout() {
        MessengerExtensions.requestCloseBrowser(
          success => {

          }, 
          err => {

          }
        );

        localStorage.clear();
        this.$router.push({ path: '/login', query: this.getQueryString() });
      },
      updateFromMessenger() {
        return fetch(`/api/updateFromMessenger?messenger_user_id=${ this.getQueryString().messenger_user_id }&code=${ this.data.code }&schedule_name=${ this.options.drpSemester.filter(a => a.value === this.selected.drpSemester)[0].text }`, {
          method: 'POST'
        })
          .then(() => {
            MessengerExtensions.requestCloseBrowser(
              success => {

              }, 
              err => {

              }
            );
          });
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