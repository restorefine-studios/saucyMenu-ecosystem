import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../src/translations/en.json";
// import LanguageDetector from 'i18next-browser-languagedetector';
// import LocizeBackend from 'i18next-locize-backend';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: en,
  },
  fr: {
    translation: {
      "Welcome to React": "Bienvenue à React et react-i18next",
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

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
