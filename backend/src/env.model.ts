export interface Env {
  PORT: number;
  CORS_ORIGIN: string;
  MY_VAR: string;
  OPENAI_API_KEY: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  JWT_SECRET: string;
  UPLOADS_DIR: string;
  MAX_IMAGE_SIZE_BYTES: number;
  CONTACT_TO_EMAIL: string;
  CONTACT_RATE_LIMIT: number;
  CONTACT_RATE_TTL_SECONDS: number;
}
