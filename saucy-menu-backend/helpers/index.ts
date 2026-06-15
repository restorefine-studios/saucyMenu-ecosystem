import Plunk from "@plunk/node";
import Elysia from "elysia";
import Redis from "ioredis";
import pino from "pino";
import Stripe from "stripe";

export function generateRandomAlphanumeric(length: number) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
export function generateRandomNumerics(length: number) {
    const characters =
        "0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export const plunk = new Plunk(process.env.PLUNK_SECRET_KEY);

// const getRedisUrl = () => {
//     const redisUrl = process.env.REDIS_URL;
//     if (!redisUrl) {
//         throw new Error('UPSTASH_REDIS_URL is not set');
//     }
//     return process.env.REDIS_URL ?? "";
// }

export const redisClient = new Redis(process.env.UPSTASH_REDIS_URL ?? '');

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2025-04-30.basil',
});

export const parseTagString = (val: string | undefined) =>
    val?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];

export const logger = pino({
    level: "info",
    transport: {
        target: "pino-pretty", // use pino transport for better stack in prod
        options: {
            colorize: true,
        },
    },
});

export const withLogging = new Elysia().onRequest(({ request }) => {
    logger.info({ method: request.method, url: request.url }, "Incoming request");
});


export const deleteFromR2 = async (key: string) => {
    await fetch(`${process.env.UPLOAD_SERVICE_URL}/delete-image/${key}`, {
        method: 'DELETE',
    });
};
