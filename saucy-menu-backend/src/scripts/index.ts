import { seedCurrencies } from "./seedCurrencies";
import { seedAllergens } from "./seedAllergens";
import { seedLanguages } from "./seedLanguages";
import { seedDiets } from "./seedDiets";
async function main() {
    await seedCurrencies();
    await seedAllergens();
    await seedLanguages();
    await seedDiets();
    console.log("🎉 All default seeds completed");
}

main().catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
});
