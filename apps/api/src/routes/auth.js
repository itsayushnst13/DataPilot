import { randomUUID } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const signToken = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h", issuer: "datapilot-api", audience: "datapilot-web" });
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/v1", maxAge: 12 * 60 * 60 * 1000 });
const setSession = (res, user) => res.cookie("datapilot_session", signToken(user), cookieOptions());

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ success: false, error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name, email, passwordHash,
        memberships: { create: { role: "ADMIN", workspace: { create: { name: input.name + "'s workspace", slug: "ws-" + randomUUID() } } } }
      },
      select: { id: true, name: true, email: true, memberships: { select: { workspace: { select: { id: true, name: true, slug: true } } } } }
    });
    setSession(res, user);
    res.status(201).json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email }, workspaces: user.memberships.map(m => m.workspace) } });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: { memberships: { include: { workspace: true } } } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    setSession(res, user);
    res.json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email }, workspaces: user.memberships.map(m => m.workspace) } });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, async (req, res) => res.json({ success: true, data: { user: req.user } }));
router.post("/logout", (_req, res) => {
  res.clearCookie("datapilot_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/v1" });
  res.status(204).end();
});
export default router;
