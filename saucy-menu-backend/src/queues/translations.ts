// import { Worker } from 'worker_threads';
// import { TranslatableFields } from '../../utils/translations';
import { SourceLanguageCode, } from "deepl-node";
import { buildTranslations, TranslatableFields } from "../../utils/translations";

// interface TranslationJob {
//     id: string;
//     fields: TranslatableFields;
//     sourceLanguage: string;
//     sourceId: string;
//     resolve: (value: any) => void;
//     reject: (error: any) => void;
// }

// class TranslationQueue {
//     private workers: Worker[] = [];
//     private queue: TranslationJob[] = [];
//     private activeJobs = new Map<string, TranslationJob>();
//     private workerCount: number;

//     constructor(workerCount = 3) {
//         this.workerCount = workerCount;
//         this.initWorkers();
//     }

//     private initWorkers() {
//         for (let i = 0; i < this.workerCount; i++) {
//             const workerPath = new URL('../workers/translations.ts', import.meta.url).href;
//             const worker = new Worker(workerPath);

//             worker.on('message', (result) => {
//                 const job = this.activeJobs.get(result.id);
//                 if (!job) return;

//                 this.activeJobs.delete(result.id);

//                 if (result.status === 'success') {
//                     job.resolve(result);
//                 } else {
//                     job.reject(new Error(result.error));
//                 }

//                 // Process next job in queue
//                 this.processNext();
//             });

//             worker.on('error', (error) => {
//                 console.error('Worker error:', error);
//             });

//             this.workers.push(worker);
//         }
//     }

//     async add(fields: TranslatableFields, sourceId: string, sourceLanguage: string): Promise<any> {
//         return new Promise((resolve, reject) => {
//             const job: TranslationJob = {
//                 id: crypto.randomUUID(),
//                 fields,
//                 sourceLanguage,
//                 sourceId,
//                 resolve,
//                 reject
//             };

//             this.queue.push(job);
//             this.processNext();
//         });
//     }

//     private processNext() {
//         // Find available worker
//         const availableWorker = this.workers.find((_, index) => {
//             return this.activeJobs.size < this.workerCount;
//         });

//         if (!availableWorker || this.queue.length === 0) return;

//         const job = this.queue.shift();
//         if (!job) return;

//         this.activeJobs.set(job.id, job);

//         // Send job to worker
//         availableWorker.postMessage({
//             id: job.id,
//             fields: job.fields,
//             sourceId: job.sourceId,
//             sourceLanguage: job.sourceLanguage,
//         });
//     }

//     async close() {
//         await Promise.all(this.workers.map(w => w.terminate()));
//     }
// }

// export const translationQueue = new TranslationQueue();



interface Job {
    id: string;
    fields: TranslatableFields;
    sourceLanguage: string;
    sourceId: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

class TranslationQueue {
    private queue: Job[] = [];
    private activeCount = 0;
    private readonly maxConcurrent = 3;

    async add(
        fields: TranslatableFields, sourceId: string, sourceLanguage: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                id: crypto.randomUUID(),
                fields,
                sourceLanguage,
                sourceId,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        // Process jobs while we have capacity
        while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job) break;

            this.activeCount++;

            // Execute job without blocking
            this.executeJob(job).finally(() => {
                this.activeCount--;
                this.processQueue(); // Process next job
            });
        }
    }

    private async executeJob(job: Job) {

        try {
            const { id, fields, sourceLanguage, sourceId } = job
            const translations = await buildTranslations(sourceLanguage as SourceLanguageCode, fields as TranslatableFields)

            job.resolve({ translations });
        } catch (error) {
            job.reject(error as Error);
        }
    }

    // Get current queue status (optional, for monitoring)
    getStatus() {
        return {
            queued: this.queue.length,
            active: this.activeCount,
            capacity: this.maxConcurrent
        };
    }
}

export const translationQueue = new TranslationQueue();