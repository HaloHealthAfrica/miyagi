import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { z } from "zod";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

export const { auth, signIn, signOut, handlers } = NextAuth({
	...authConfig,
	// Make production deployments more resilient to differing env var conventions.
	// NextAuth (Auth.js) needs a stable secret; accept either AUTH_SECRET or NEXTAUTH_SECRET.
	secret: authSecret,
	// In serverless/proxied environments (Vercel), trust the incoming host headers.
	trustHost: true,
	// If AUTH_URL/NEXTAUTH_URL is set, pass it through (helps behind proxies / custom domains).
	...(authUrl ? { url: authUrl } : {}),
	adapter: PrismaAdapter(prisma),
	session: {
		strategy: "jwt",
	},
	providers: [
		Credentials({
			async authorize(credentials) {
				const parsedCredentials = z
					.object({
						email: z.string().email(),
						password: z.string().min(6),
					})
					.safeParse(credentials);

				if (parsedCredentials.success) {
					const { email, password } = parsedCredentials.data;
					
					const user = await prisma.user.findUnique({
						where: { email },
					});

					if (!user || !user.password) return null;

					const passwordsMatch = await bcrypt.compare(
						password,
						user.password
					);

					if (passwordsMatch) {
						return {
							id: user.id,
							email: user.email,
							name: user.name,
						};
					}
				}

				console.log("Invalid credentials");
				return null;
			},
		}),
	],
});
