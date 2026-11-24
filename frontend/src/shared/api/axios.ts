import axios from "axios";

// Vercel deploys the frontend and backend as separate projects, so production
// must set VITE_API_URL. The localhost fallback keeps `npm run dev` working.
const baseURL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export const axiosInstance = axios.create({ baseURL });
