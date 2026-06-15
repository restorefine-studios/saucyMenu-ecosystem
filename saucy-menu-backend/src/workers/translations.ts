// worker.ts - The background worker

import { SourceLanguageCode } from "deepl-node";
import { buildTranslations, TranslatableFields } from "../../utils/translations";

// Listen for messages from main thread
self.onmessage = async (event: MessageEvent) => {
    const { id, fields, sourceLanguage, sourceId } = event.data;

    try {
        // Translate in parallel
        const translations = await buildTranslations(sourceLanguage as SourceLanguageCode, fields as TranslatableFields)

        // Send success back to main thread
        self.postMessage({
            id,
            status: 'success',
            sourceId,
            translations
        });
    } catch (error: any) {
        // Send error back to main thread
        self.postMessage({
            id,
            status: 'error',
            sourceId,
            error: error.message
        });
    }
};