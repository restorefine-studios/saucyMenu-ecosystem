import { Elysia, status } from "elysia";
import swagger from "@elysiajs/swagger";
import cors from "@elysiajs/cors";

import AdminRouter from "./api/admin";
import SharedRouter from "./api/shared";
import UserRouter from "./api/user";
import SuperRouter from "./api/super-admin";
import webhookRoutes from './api/webhook'
// import Stripe from "stripe";
import dishUploadQueue, { drinkUploadQueue } from "./queues/dishUpload";
import { pinoLogger } from "../helpers/logger";
import { S3Client } from "bun";
import { deeplClient } from "../utils/deepl";
import { TargetLanguageCode } from "deepl-node";
import { auth } from "./lib/auth";


export const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: process.env.R2_BUCKET_NAME!,

});

const PORT = process.env.PORT || 8080;



const app = new Elysia()

  .derive({ as: 'global' }, ({ request, set }) => {
    const startTime = Date.now();

    return {
      logRequest: () => {

        if (request.method === 'OPTIONS') return;
        const method = request.method;
        const url = request.url;
        const duration = Date.now() - startTime;

        const status = set.status
        const logLevel = Number(status) >= 400 ? 'warn' : 'info';


        pinoLogger[logLevel]({
          method,
          url,
          status,
          duration: `${duration}ms`,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'
        }, `${method} ${url} - ${status} (${duration}ms)`);
      }
    };
  })
  .onRequest(({ request }) => {
    pinoLogger.debug({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    }, `Incoming request: ${request.method} ${request.url}`);
  })
  .onAfterHandle(async ({ responseValue, request }) => {
    // console.log('status', set.status);
    // logRequest();
    // const url = new URL(request.url);
    // const lang = url.searchParams.get("lang");
    const lang = request.headers.get('lang');

    if (lang === 'en' || !lang) return responseValue;
    const fieldsToTranslate = ['message', 'title']


    if (!lang || typeof responseValue !== "object" || responseValue === null) return;

    const result: any = { ...responseValue };

    for (const key of fieldsToTranslate) {
      if (typeof result[key] === "string") {
        try {
          result[key] = (await deeplClient.translateText(result[key], 'en', lang as TargetLanguageCode)).text;
        } catch (err) {
          console.error("Translation error:", err);
        }
      }
    }
    return result;
  })
  .onError(({ error, request, set, code }) => {
    let statusCode = 500;
    let message = 'Internal server error';

    // if(typeof error === ElysiaE)

    // Check if it's a standard Error with message
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
    }

    // Check if it's an ElysiaCustomStatusResponse
    if ('response' in error && error.response) {
      const response = error.response as any;
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response.message) {
        message = response.message;
      }
    }

    // Get status code from various sources
    if ('status' in error && typeof error.status === 'number') {
      statusCode = error.status;
    } else if (set.status && typeof set.status === 'number') {
      statusCode = set.status;
    }

    // Handle Elysia error codes
    if (code === 'VALIDATION') {
      statusCode = 400;
      message = 'Validation failed';
    } else if (code === 'NOT_FOUND') {
      statusCode = 404;
      message = 'Not found';
    } else if (code === 'PARSE') {
      statusCode = 400;
      message = 'Invalid request format';
    }

    // Log the error
    pinoLogger.error({
      status: statusCode,
      error: error,
      url: request?.url,
      code
    }, `Error: ${message}`);

    // Set status and return formatted response
    set.status = statusCode;

    return {
      message: message
    };
  })
  .onAfterResponse(({ logRequest }) => {
    logRequest?.();
  })

  .use(cors())
  .mount(auth.handler)
  .use(AdminRouter)
  .use(UserRouter)
  .use(SharedRouter)
  .use(SuperRouter)
  .use(webhookRoutes)
  .get('/test-error', () => {
    throw new Error('Test error')
  })
  .get('/test-error-helper', () => {
    return status(400, 'Test error with helper')
  })

if (process.env.NODE_ENV !== "production") {
  app.use(swagger({
    documentation: {
      info: {
        title: "Saucy Menu API",
        description: "Saucy Menu API",
        version: "1.0.0"
      }
    }
  }))
}
app.listen(PORT);

app.get('/healthz', () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString()
}))




const jobs = await dishUploadQueue.getJobs('waiting', { start: 0, end: 100 });
console.log(jobs.map(j => ({
  id: j.id,
  data: j.data,
  status: 'waiting'
})) ?? []);
const drinkJobs = await drinkUploadQueue.getJobs('waiting', { start: 0, end: 100 });
console.log(drinkJobs.map(j => ({
  id: j.id,
  data: j.data,
  status: 'waiting'
})) ?? []);


// const sendmail = async () => {
//   await plunk.emails.send({
//     to: "impactmadeimran@gmail.com",
//     subject: "Super Admin Signup",
//     body: await renderWelcomeEmail("Imran Yemoh", "impactmadeimran@gmail.com", "123456")
//   })
//   console.log('sent')
// }

// sendmail()




console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
