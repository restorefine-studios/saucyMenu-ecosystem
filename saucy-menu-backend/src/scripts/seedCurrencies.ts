import { db } from "../db";
import { currencies } from "../db/schema"; // Adjust to match your schema
import { eq } from "drizzle-orm";

const defaultCurrencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "EUR", name: "Euro", symbol: "€" },
];

export async function seedCurrencies() {
    for (const currency of defaultCurrencies) {
        const exists = await db
            .select()
            .from(currencies)
            .where(eq(currencies.code, currency.code));

        if (exists.length === 0) {
            await db.insert(currencies).values(currency);
        }
    }

    console.log("✅ Currencies seeded");
}
