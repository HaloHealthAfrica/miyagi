"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const registerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerAction(
	_prevState: string | undefined,
	formData: FormData
): Promise<string | undefined> {
	try {
		const name = formData.get("name") as string;
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const validationResult = registerSchema.safeParse({ name, email, password });
		if (!validationResult.success) {
			return validationResult.error.errors[0]?.message ?? "Invalid input";
		}

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) return "User with this email already exists";

		const hashedPassword = await bcrypt.hash(password, 10);

		await prisma.user.create({
			data: { name, email, password: hashedPassword },
		});
	} catch (error) {
		console.error("Registration error:", error);
		return "Something went wrong during registration";
	}

	redirect("/login");
}


