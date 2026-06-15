import { SourceLanguageCode, TargetLanguageCode } from "deepl-node";
import { SUPPORTED_LANGUAGES } from "../config/languages";
import { deeplClient } from "./deepl";
import { pinoLogger } from "../helpers/logger";
import { isArray } from "lodash";

export type TranslatableFields = Record<string, string | Array<string>>;

export async function buildTranslations(
    sourceLanguage: SourceLanguageCode,
    fields: TranslatableFields
) {
    try {

        const translations: Record<string, Record<string, string>> = {};

        for (const lang of SUPPORTED_LANGUAGES) {
            translations[lang.code] = {};

            for (const [key, value] of Object.entries(fields)) {
                if (isArray(value)) {
                    translations[lang.code][key] = (await deeplClient.translateText(value, sourceLanguage, lang.code as TargetLanguageCode)).map(item => item.text).join(',');
                } else {
                    translations[lang.code][key] = (await deeplClient.translateText(value, sourceLanguage, lang.code as TargetLanguageCode)).text;
                }
            }
        }
        // console.log(translations)
        return translations;
    } catch (error) {
        pinoLogger.error(error, 'Error building translations');
    }
}

export function resolveTranslatedField(
    baseValue: string,
    translations: any,
    key: string,
    lang?: string
) {
    if (['en', 'en-gb', 'en-us'].includes(lang?.toLocaleLowerCase() as string)) {
        return translations?.['en-GB']?.[key] ?? baseValue;
    }
    // console.log(baseValue, translations, key, lang)
    return translations?.[lang as any]?.[key] ?? baseValue;
}