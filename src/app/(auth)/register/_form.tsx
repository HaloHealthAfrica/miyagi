"use client";

import { ArrowRightIcon, AtSignIcon, KeyIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function RegisterForm({
	registerAction,
}: {
	registerAction: (
		prevState: string | undefined,
		formData: FormData
	) => Promise<string | undefined>;
}) {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
	const [isPending, setIsPending] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setIsPending(true);

		const formData = new FormData(e.currentTarget);

		await toast.promise(registerAction(undefined, formData), {
			loading: "Creating your account...",
			success: "Account created! Redirecting to login...",
			error: err => err || "Could not create account.",
		});

		setIsPending(false);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<div className="flex-1 rounded-lg px-6 pb-4 pt-8">
				<h1 className="mb-3 text-2xl">Please register to continue.</h1>
				<div className="w-full">
					<div>
						<label
							className="mb-3 mt-5 block text-xs font-medium text-gray-900 dark:text-gray-100"
							htmlFor="email"
						>
							Name
						</label>
						<div className="relative">
							<input
								className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
								id="name"
								type="text"
								name="name"
								placeholder="Enter your name"
								required
							/>
							<User className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
						</div>
					</div>
					<div>
						<label
							className="mb-3 mt-5 block text-xs font-medium text-gray-900 dark:text-gray-100"
							htmlFor="email"
						>
							Email
						</label>
						<div className="relative">
							<input
								className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
								id="email"
								type="email"
								name="email"
								placeholder="Enter your email address"
								required
							/>
							<AtSignIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
						</div>
					</div>
					<div className="mt-4">
						<label
							className="mb-3 mt-5 block text-xs font-medium text-gray-900 dark:text-gray-100"
							htmlFor="password"
						>
							Password
						</label>

						<div className="relative">
							<input
								className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
								id="password"
								type="password"
								name="password"
								placeholder="Enter password"
								required
								minLength={6}
							/>
							<KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
						</div>
					</div>
				</div>
				
				<input type="hidden" name="redirectTo" value={callbackUrl} />
				
				<Button
					type="submit"
					className="mt-4 w-full text-gray-50"
					disabled={isPending}
				>
					{isPending ? "Registering..." : "Register Account"}
					<ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
				</Button>

				<div className="flex flex-row items-center justify-center gap-1 mt-4">
					<span>Already have an account?</span>
					<Link
						href="/login"
						className="text-blue-500 hover:underline"
					>
						Login here
					</Link>
				</div>
			</div>
		</form>
	);
}
