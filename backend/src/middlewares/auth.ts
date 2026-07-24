import { Request, Response, NextFunction } from "express";

// Guard for resource endpoints (README §2.1). A missing/invalid session must
// return 401 — never serve data and never crash.
export function ensureAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated?.() && req.user) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
}
