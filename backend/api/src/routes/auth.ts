import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/auth.js";

const router = Router();

/** POST /api/auth/login */
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, companyId: user.companyId ?? undefined });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

/** POST /api/auth/register */
router.post("/auth/register", async (req, res) => {
  const { name, email, password, role = "driver", phone, companyId } = req.body as {
    name: string; email: string; password: string;
    role?: string; phone?: string; companyId?: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name, email: email.toLowerCase(), passwordHash,
      role: role as any, phone, companyId,
    }).returning();
    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, companyId: user.companyId ?? undefined });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

export default router;
