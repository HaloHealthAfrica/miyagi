"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticateAction(
	_prevState: string | undefined,
	formData: FormData
): Promise<"Invalid credentials." | "Something went wrong." | undefined> {
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


