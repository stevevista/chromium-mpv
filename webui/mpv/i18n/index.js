import { I18n } from 'i18n-js'

const files = require.context('.', false, /\.yml$/)
const translations = {}

files.keys().forEach(key => {
  translations[key.replace(/(\.\/|\.yml)/g, '')] = files(key)
})

const i18n = new I18n(translations)

i18n.defaultLocale = 'en'
i18n.locale = navigator.language

export default i18n
