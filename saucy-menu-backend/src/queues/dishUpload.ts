import BeeQueue from 'bee-queue';

const redisUrl = new URL(process.env.UPSTASH_REDIS_URL!);

const dishUploadQueue = new BeeQueue('dish-upload', {
    redis: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: true, // Fly Upstash requires TLS
    },
    removeOnSuccess: true,
    removeOnFailure: true,
    isWorker: true,
});

export const drinkUploadQueue = new BeeQueue('drink-upload', {
    redis: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: true, // Fly Upstash requires TLS
    },
    removeOnSuccess: true,
    removeOnFailure: true,
    isWorker: true,
});

// dishUploadQueue.getJobs('waiting', { start: 0, end: 25 }).then((jobs) => {
//     const jobIds = jobs.map((job) => job.id);
//     console.log(` waiting Job ids: ${jobIds.join(' ')}`);
// });

// dishUploadQueue.getJobs('failed', { size: 100 }).then((jobs) => {
//     const jobIds = jobs.map((job) => job.id);
//     console.log(`failed Job ids: ${jobIds.join(' ')}`);
// });
// dishUploadQueue.checkStalledJobs(5000, (err, numStalled) => {
//     // prints the number of stalled jobs detected every 5000 ms
//     console.log('Checked stalled jobs', numStalled);
// });

export default dishUploadQueue;
