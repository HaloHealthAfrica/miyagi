import { PropsWithChildren } from "react";
import { TrendingUp } from "lucide-react";

export default function layout({ children }: PropsWithChildren) {
	return (
		<main className="flex items-center justify-center">
			<div className="relative mx-auto flex w-full flex-col space-y-2.5 p-4">
				<div className="w-full flex flex-row gap-5">
					<div className="hidden md:inline-block w-2/3 h-screen bg-blue-500"></div>
					<div className="w-full md:w-1/3 h-screen flex justify-center items-center">
						<div>
							<div className="flex h-16 items-center justify-center border-b border-border px-6">
								<div className="flex items-center gap-2">
									<TrendingUp className="h-6 w-6 text-primary" />
									<span className="text-lg font-bold">
										Miyagi
									</span>
								</div>
							</div>

							{children}
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
