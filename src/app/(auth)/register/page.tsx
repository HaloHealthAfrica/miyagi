import RegisterForm from "./_form";
import { Suspense } from "react";
import { registerAction } from "./actions";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
	return (
		<Suspense>
			<RegisterForm registerAction={registerAction} />
		</Suspense>
	);
}
