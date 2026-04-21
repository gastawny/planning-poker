export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
  appUrl: import.meta.env.VITE_APP_URL ?? "http://localhost:3000",
} satisfies Record<string, string>;
