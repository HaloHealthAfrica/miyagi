import { handlers } from "@/auth";

// NextAuth + Prisma must run on the Node.js runtime (not Edge).
export const runtime = "nodejs";

export const { GET, POST } = handlers;


