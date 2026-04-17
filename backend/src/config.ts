import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n`,
    );
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  twitch: {
    clientId: requireEnv("TWITCH_CLIENT_ID"),
    clientSecret: requireEnv("TWITCH_CLIENT_SECRET"),
  },
  ollama: {
    apiUrl: requireEnv("OLLAMA_API_URL"),
    model: requireEnv("OLLAMA_MODEL"),
  }
};
