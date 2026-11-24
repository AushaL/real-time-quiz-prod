import type { Request } from "express";

export interface RequestAuth {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: RequestAuth;
}
