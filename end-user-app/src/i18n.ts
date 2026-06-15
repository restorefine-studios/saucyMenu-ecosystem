import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../src/translations/en.json'
import fr from '../src/translations/fr.json'
import zh from '../src/translations/zh.json'
import it from '../src/translations/it.json'
import ar from '../src/translations/ar.json'
import es from '../src/translations/es.json'
import pt from '../src/translations/pt.json'
import nl from '../src/translations/nl.json'
import ro from '../src/translations/ro.json'
import ja from '../src/translations/ja.json'
import de from '../src/translations/de.json'
import pl from '../src/translations/pl.json'
import hi from '../src/translations/hi.json'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: en,
  },
  fr: { translation: fr },
  zh: { translation: zh },
  it: { translation: it },
  ar: { translation: ar },
  es: { translation: es },
  pt: { translation: pt },
  nl: { translation: nl },
  ro: { translation: ro },
  ja: { translation: ja },
  de: { translation: de },
  pl: { translation: pl },
  hi: { translation: hi },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })

export default i18n
