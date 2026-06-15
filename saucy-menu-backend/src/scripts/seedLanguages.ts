import { db } from "../db";
import { languages } from "../db/schema";

const defaultLanguages = [
    {
        "code": "ar",
        "name": "العربية (Arabic)",
        "flag": "flags/saudi.png"
    },
    {
        "code": "de",
        "name": "Deutsch (German)",
        "flag": "flags/germany.png"
    },
    {
        "code": "en",
        "name": "English (UK)",
        "flag": "flags/england.png"
    },
    {
        "code": "es",
        "name": "Español (Spanish)",
        "flag": "flags/spain.png"
    },
    {
        "code": "fr",
        "name": "Français (French)",
        "flag": "flags/france.png"
    },
    {
        "code": "hi",
        "name": "हिंदी (Hindi)",
        "flag": "flags/india.png"
    },
    {
        "code": "it",
        "name": "Italiano (Italian)",
        "flag": "flags/italy.png"
    },
    {
        "code": "ja",
        "name": "日本語 (Japanese)",
        "flag": "flags/japan.png"
    },
    {
        "code": "nl",
        "name": "Nederlands (Dutch)",
        "flag": "flags/netherlands.png"
    },
    {
        "code": "pl",
        "name": "Polski (Polish)",
        "flag": "flags/poland.png"
    },
    {
        "code": "pt",
        "name": "Português (Portuguese)",
        "flag": "flags/portugal.png"
    },
    {
        "code": "ro",
        "name": "Română (Romanian)",
        "flag": "flags/romania.png"
    },
    {
        "code": "zh",
        "name": "中文 (Chinese)",
        "flag": "flags/china.png"
    }
]

export async function seedLanguages() {
    for (const lang of defaultLanguages) {
        const exists = await db.query.languages.findFirst({
            where: (la, { eq }) => eq(la.name, lang.name),
        });

        if (!exists) {
            await db.insert(languages).values({
                ...lang
            });
        }
    }

    console.log("✅ Languages seeded");
}