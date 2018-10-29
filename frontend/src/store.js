import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    selected: {}
  },
  mutations: {
    updateSelected(state, selected) {
      state.selected = {...state.selected, ...selected}
    }
  },
  plugins: [createPersistedState()]
});

export default store