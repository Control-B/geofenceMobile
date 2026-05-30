import type { RequestHandler } from "express";
import { verifyToken } from "../lib/auth.js";

export interface AuthLocals {
  userId: string;
  email: string;
  role: string;
  name: string;
  companyId?: string;
}

declare global {
  namespace Express {
    interface Locals extends AuthLocals {}
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    res.locals.userId = payload.userId;
    res.locals.email = payload.email;
    res.locals.role = payload.role;
    res.locals.name = payload.name;
    res.locals.companyId = payload.companyId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireRole = (...roles: string[]): RequestHandler =>
  (req, res, next) => {
    if (!roles.includes(res.locals.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
