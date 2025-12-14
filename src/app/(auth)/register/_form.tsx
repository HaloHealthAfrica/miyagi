"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFormState } from "react-dom";
import { useSearchParams } from "next/navigation";

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
    
	const [errorMessage, formAction, isPending] = useFormState(
		registerAction,
		undefined
	);

	return (
		<form action={formAction} className="space-y-3">
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
							{/* <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" /> */}
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
							{/* <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" /> */}
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
							{/* <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" /> */}
						</div>
					</div>
				</div>
				<input type="hidden" name="redirectTo" value={callbackUrl} />
				<Button className="mt-4 w-full" aria-disabled={isPending} disabled={isPending}>
					{isPending ? "Registering..." : "Register Account"}
					{/* <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" /> */}
				</Button>
				<div
					className="flex h-8 items-end space-x-1"
					aria-live="polite"
					aria-atomic="true"
				>
					{errorMessage && (
						<>
							{/* <ExclamationCircleIcon className="h-5 w-5 text-red-500" /> */}
							<p className="text-sm text-red-500">
								{errorMessage}
							</p>
						</>
					)}
				</div>

                <div className="flex flex-row items-center justify-center gap-1">
                    <span>Already have an account?</span>
                    <Link href="/login" className="text-blue-500 hover:underline">
                        Login here
                    </Link>
                </div>
			</div>
		</form>
	);
}
