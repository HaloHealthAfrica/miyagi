import { AuthError } from "next-auth";
import LoginForm from "./_form";
import { Suspense } from "react";
import { signIn } from "@/auth";

export default function LoginPage() {
	async function authenticateAction(
		prevState: string | undefined,
		formData: FormData
	) {
		"use server";

		try {
			await signIn("credentials", formData);
		} catch (error) {
			if (error instanceof AuthError) {
				switch (error.type) {
					case "CredentialsSignin":
						return "Invalid credentials.";
					default:
						return "Something went wrong.";
				}
			}
			throw error;
		}
	}

	return (
		<Suspense>
			<LoginForm authenticateAction={authenticateAction} />
		</Suspense>
	);
}
