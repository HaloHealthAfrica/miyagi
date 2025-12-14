import RegisterForm from "./_form";
import { Suspense } from "react";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const registerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function RegisterPage() {
	async function registerAction(
		prevState: string | undefined,
		formData: FormData
	) {
		"use server";

		try {
			const name = formData.get("name") as string;
			const email = formData.get("email") as string;
			const password = formData.get("password") as string;

			// Validate input
			const validationResult = registerSchema.safeParse({ name, email, password });

			if (!validationResult.success) {
				return validationResult.error.errors[0].message;
			}

			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email },
			});

			if (existingUser) {
				return "User with this email already exists";
			}

			// Hash password
			const hashedPassword = await bcrypt.hash(password, 10);

			// Create user
			await prisma.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
				},
			});

			// Redirect to login page on success
		} catch (error) {
			console.error("Registration error:", error);
			return "Something went wrong during registration";
		}

		redirect("/login");
	}

	return (
		<Suspense>
			<RegisterForm registerAction={registerAction} />
		</Suspense>
	);
}
