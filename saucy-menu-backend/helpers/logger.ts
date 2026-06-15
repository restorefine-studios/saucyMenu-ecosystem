import Elysia from "elysia";
import pino from "pino";

export const pinoLogger = pino({
    level: "info",
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            },
            {
                target: '@logtail/pino',
                options: {
                    sourceToken: process.env.PINO_TOKEN,
                    options: {
                        endpoint: process.env.PINO_SOURCE_URL
                    }
                }
            },
        ]
    },
    redact: ['body.password', 'body.newPassword', 'headers.authorization', '*.password', '*.*.password',]
});

export const loggingPlugin = new Elysia()
    .derive({ as: 'scoped' }, ({ request, set }) => {
        const startTime = Date.now();

        return {
            logRequest: () => {
                const method = request.method;
                const url = request.url;
                const duration = Date.now() - startTime;
                const status = set.status ?? 200;

                pinoLogger.info({
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
    .onAfterHandle(({ logRequest }) => {
        logRequest();
    })
// .onError(({ error, request, set }) => {
//     const status = set.status ?? 500;

//     logger.error({
//         error: {
//             message: error.message,
//             stack: error.stack,
//             name: error.name
//         },
//         method: request.method,
//         url: request.url,
//         status
//     }, `Error handling request: ${request.method} ${request.url}`);
// });