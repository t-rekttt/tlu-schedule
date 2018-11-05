import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    selected: {
      view_mode: ['coming']
    },
    data: {}
  },
  mutations: {
    updateSelected(state, selected) {
      state.selected = {...state.selected, ...selected}
    },
    updateData(state, data) {
      state.data = data;
    }
  },
  plugins: [createPersistedState()]
});

export default store