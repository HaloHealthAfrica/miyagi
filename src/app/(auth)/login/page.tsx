import LoginForm from "./_form";
import { Suspense } from "react";
import { authenticateAction } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm authenticateAction={authenticateAction} />
		</Suspense>
	);
}
