import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import bcrypt from "bcrypt";
import { prisma } from "./lib/prisma";
import { z } from "zod";

export const { auth, signIn, signOut, handlers } = NextAuth({
	...authConfig,
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
