import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import {
  VApp,
  VIcon,
} from 'vuetify/components'
import i18n from '../player/i18n'
import App from './components/app'
import LivePlayer from './components/live'

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import '~/renderer/styles/web-ui-style.scss'
import './style.scss'

import 'bella-player-plugin/player-components'

const vuetify = createVuetify({
  components: {
    VApp,
    VIcon,
  },
  directives: {},
  theme: {
    defaultTheme: 'dark'
  }
})

const params = (new URL(document.location)).searchParams;
const isLive = params.has('live') || document.location.protocol === 'rtsp:'

createApp(isLive ? LivePlayer : App)
  .use(createPinia())
  .use(i18n)
  .use(vuetify)
  .mount('#app')
