
declare module "bun" {
    interface Env {
        JWT_SECRET: string;
        DATABASE_URL: string;
        NODE_ENV?: "development" | "production" | "test"; // Optional
        PLUNK_SECRET_KEY: string;
        UPSTASH_REDIS_URL: string;
        STRIPE_SECRET_KEY: string;
        STRIPE_PUBLISHABLE_KEY: string;
        STRIPE_WEBHOOK_SECRET: string;
        PINO_TOKEN: string;
        PINO_SOURCE_URL: string;
        UPLOAD_SERVICE_URL: string;
        R2_ACCOUNT_ID: string;
        R2_ACCESS_KEY_ID: string;
        R2_SECRET_ACCESS_KEY: string;
        R2_BUCKET_NAME: string;
        DEEPL_API_KEY: string;
    }
}