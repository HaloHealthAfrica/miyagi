import { auth, signOut } from "@/auth";

import DashboardData from "./_dash";
import { MainLayout } from "@/components/layout/MainLayout";

export default async function Dashboard() {
	const session = await auth();
	const logoutUserAction = async () => {
		"use server";
		await signOut({ redirectTo: "/" });
	};

	return (
		<MainLayout>
			<DashboardData
				session={session}
				logoutUserAction={logoutUserAction}
			/>
		</MainLayout>
	);
}
