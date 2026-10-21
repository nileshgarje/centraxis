import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    
    // Database (PostgreSQL)
    DATABASE_URL: z.string().url(),
    
    // Cache & Pub/Sub (Redis)
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    
    // Auth.js / NextAuth
    AUTH_SECRET: z.string().min(1).default("default_dev_auth_secret_change_in_production"),
    NEXTAUTH_URL: z.string().url().optional(),
    
    // Microsoft Entra ID (Azure AD) SSO
    AZURE_AD_CLIENT_ID: z.string().min(1).default("placeholder_azure_ad_client_id"),
    AZURE_AD_CLIENT_SECRET: z.string().min(1).default("placeholder_azure_ad_client_secret"),
    AZURE_AD_TENANT_ID: z.string().min(1).default("placeholder_azure_ad_tenant_id"),
    
    // Keycloak-compatible Bootstrap Admin (KC_BOOTSTRAP_ADMIN_*)
    KC_BOOTSTRAP_ADMIN_USERNAME: z.string().optional(),
    KC_BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),

    // AI Story Agent
    OPENAI_API_KEY: z.string().min(1).optional(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === "lint" ||
    process.env.npm_lifecycle_event === "build",
});
