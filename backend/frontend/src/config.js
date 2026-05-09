// This file determines which URL to call based on the environment.
// In production (e.g. Vercel), it uses the URL of your hosted Render backend.
// In development (local machine), it uses localhost.

export const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");
