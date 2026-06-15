/* eslint-disable @typescript-eslint/no-explicit-any */
// translate.ts
import axios from "axios";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.DEEPL_API_KEY;
const TARGET_LANGS = ["FR", "PL", "ZH", "IT", "AR", "ES", "PT", "NL", "RO", "JA", "DE"];
const SOURCE_LANG = "EN";
const SOURCE_FILE = "./src/translations/en.json";

console.log(process.env.DEEPL_API_KEY);

const sourceData = JSON.parse(readFileSync(SOURCE_FILE, "utf8"));

const flatten = (obj: any, prefix = "") =>
    Object.entries(obj).reduce((acc: any, [key, val]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === "object") Object.assign(acc, flatten(val, fullKey));
        else acc[fullKey] = val;
        return acc;
    }, {} as Record<string, string>);

const unflatten = (flatObj: Record<string, string>) => {
    const result: any = {};
    for (const flatKey in flatObj) {
        const keys = flatKey.split(".");
        keys.reduce((acc, key, idx) => {
            if (idx === keys.length - 1) acc[key] = flatObj[flatKey];
            else acc[key] ??= {};
            return acc[key];
        }, result);
    }
    return result;
};

const translateText = async (text: string, targetLang: string) => {
    try {
        const res = await axios.post(
            "https://api.deepl.com/v2/translate",
            {

                text: [text],
                source_lang: SOURCE_LANG,
                target_lang: targetLang,
            },
            {
                headers: {
                    Authorization: `DeepL-Auth-Key ${API_KEY}`,
                    "Content-Type": "application/json",
                }
            }

        );
        return res.data.translations[0].text;
    } catch (err: any) {
        console.error(`❌ DeepL error for text "${text}"`, err?.response?.data || err.message);
        throw err;
    }
};

(async () => {
    const flatSource = flatten(sourceData);

    // for (const lang of TARGET_LANGS) {
    //     const translated: Record<string, string> = {};

    //     for (const [key, value] of Object.entries(flatSource)) {
    //         if (
    //             typeof value !== "string" ||
    //             value.trim() === "" ||
    //             !value.match(/[a-zA-Z0-9]/) // skip non-alphanumeric
    //         ) {
    //             translated[key] = value;
    //             continue;
    //         }

    //         try {
    //             await new Promise((res) => setTimeout(res, 200)); // wait 200ms
    //             const translatedValue = await translateText(value, lang);

    //             translated[key] = translatedValue;
    //             console.log(`[${lang}] ${key}: ${translatedValue}`);
    //         } catch (err: any) {
    //             console.error(
    //                 `❌ Error translating key "${key}" with value "${value}":`,
    //                 err?.response?.data || err.message
    //             );
    //             translated[key] = value; // fallback to original
    //         }
    //     }

    //     const nested = unflatten(translated);
    //     const outputDir = `./src/translations`;
    //     mkdirSync(outputDir, { recursive: true });
    //     writeFileSync(join(outputDir, `${lang.toLowerCase()}.json`), JSON.stringify(nested, null, 2));
    // }

    for (const lang of TARGET_LANGS) {
        const targetFilePath = join("./src/translations", `${lang.toLowerCase()}.json`);
        let existingTargetData: Record<string, string> = {};

        try {
            const targetRaw = readFileSync(targetFilePath, "utf8");
            const parsed = JSON.parse(targetRaw);
            existingTargetData = flatten(parsed);
        } catch {
            console.log(`🆕 ${lang.toLowerCase()}.json not found. Creating new one.`);
        }

        const translated: Record<string, any> = { ...existingTargetData };

        for (const [key, value] of Object.entries(flatSource)) {
            // Skip if already translated
            if (translated[key]) continue;

            if (
                typeof value !== "string" ||
                value.trim() === "" ||
                !value.match(/[a-zA-Z0-9]/) // skip non-alphanumeric
            ) {
                translated[key] = value;
                continue;
            }

            try {
                await new Promise((res) => setTimeout(res, 200)); // wait 200ms
                const translatedValue = await translateText(value, lang);
                translated[key] = translatedValue;
                console.log(`[${lang}] ${key}: ${translatedValue}`);
            } catch (err: any) {
                console.error(
                    `❌ Error translating key "${key}" with value "${value}":`,
                    err?.response?.data || err.message
                );
                translated[key] = value; // fallback to original
            }
        }

        const nested = unflatten(translated);
        mkdirSync("./src/translations", { recursive: true });
        writeFileSync(targetFilePath, JSON.stringify(nested, null, 2));
    }

})();

