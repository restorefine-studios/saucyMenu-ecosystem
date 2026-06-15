import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../src/translations/en.json";
import fr from "../src/translations/fr.json";
import pl from "../src/translations/pl.json";
import zh from "../src/translations/zh.json";
import it from "../src/translations/it.json";
import ar from "../src/translations/ar.json";
import es from "../src/translations/es.json";
import pt from "../src/translations/pt.json";
import nl from "../src/translations/nl.json";
import ro from "../src/translations/ro.json";
import ja from "../src/translations/ja.json";
import de from "../src/translations/de.json";
// import hi from "../src/translations/hi.json";
import LanguageDetector from "i18next-browser-languagedetector";
// import de from "../src/translations/de.json";
// import es from "../src/translations/es.json";
// import LanguageDetector from 'i18next-browser-languagedetector';
// import LocizeBackend from 'i18next-locize-backend';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: en,
  },
  fr: { translation: fr },
  pl: { translation: pl },
  de: { translation: de },
  es: { translation: es },
  zh: { translation: zh },
  it: { translation: it },
  ar: { translation: ar },
  pt: { translation: pt },
  nl: { translation: nl },
  ro: { translation: ro },
  ja: { translation: ja },
  // hi: { translation: hi },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// export const locizeOptions = {
//     projectId: import.meta.env.VITE_APP_LOCIZE_PROJECT_ID,
//     apiKey: import.meta.env.VITE_APP_LOCIZE_API_KEY,
// }

// i18n
//     // detect user language
//     // learn more: https://github.com/i18next/i18next-browser-languageDetector
//     .use(LanguageDetector)
//     // pass the i18n instance to react-i18next.
//     .use(initReactI18next)
//     .use(LocizeBackend)
//     // init i18next
//     // for all options read: https://www.i18next.com/overview/configuration-options
//     .init({
//         debug: true,
//         fallbackLng: 'en',
//         lng: 'en',
//         interpolation: {
//             escapeValue: false, // not needed for react as it escapes by default
//         },
//         // resources: {
//         //     en: {
//         //         translation: {
//         //             // here we will place our translations...
//         //         }
//         //     }
//         // },
//         backend: locizeOptions,
//         ns: ['first'], // default namespace
//         defaultNS: 'first',
//     });

export default i18n;
