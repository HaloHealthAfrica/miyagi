import LoginForm from "./_form";
import { Suspense } from "react";
import { authenticateAction } from "./actions";

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm authenticateAction={authenticateAction} />
		</Suspense>
	);
}
