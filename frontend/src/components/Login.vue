<template>
  <div id="login">
    <div class="row">
      <div class="col-md-6 offset-md-3">
        <h2 class="text-center">Đăng nhập</h2>
        <b-form @submit="onSubmit" @reset="onReset" v-if="show">
          <b-form-group id="ma_sv"
                        label="Mã sinh viên"
                        label-for="ma_sv">
            <b-form-input id="ma_sv"
                          type="text"
                          v-model="form.ma_sv"
                          required
                          placeholder="1851160001">
            </b-form-input>
          </b-form-group>
          <b-form-group id="password"
                        label="Mật khẩu"
                        label-for="password">
            <b-form-input id="password"
                          type="password"
                          v-model="form.password"
                          required
                          placeholder="********">
            </b-form-input>
          </b-form-group>
          <p class="text-danger">{{ error_message }}</p>
          <p class="text-info">{{ status_message }}</p>
          <div class="text-center">
            <b-button type="submit" variant="primary" :disabled="logging_in">Đăng nhập</b-button>
          </div>
        </b-form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      form: {
        ma_sv: '',
        password: '',
      },
      error_message: null,
      status_message: null,
      show: true,
      logging_in: false
    }
  },
  methods: {
    getQueryString() {
        let qs = {};

        let query = new URL(window.location).searchParams;

        for (let q of query) {
          qs[q[0]] = q[1];
        }

        return qs;
    },
    onSubmit (evt) {
      this.error_message = null;
      this.status_message = 'Đang đăng nhập...';
      this.logging_in = true;
      evt.preventDefault();

      fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(this.form),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          console.log(this.getQueryString());
          this.$router.push({ path: '/', query: this.getQueryString() });
        }

        this.error_message = res.message;
        this.status_message = null;
        this.logging_in = false;
      })
      .catch(err => {
        console.log(err);

        this.error_message = 'Lỗi không xác định';
        this.logging_in = false;
      });
    },
    onReset (evt) {
      evt.preventDefault();
      /* Reset our form values */
      this.form.ma_sv = '';
      this.form.password = '';
      /* Trick to reset/clear native browser form validation state */
      this.show = false;
      this.$nextTick(() => { this.show = true });
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  #login {
    padding-top: 150px;
  }
</style>
