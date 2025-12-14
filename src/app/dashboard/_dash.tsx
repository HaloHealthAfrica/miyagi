"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PowerIcon, TrendingDown, TrendingUp } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getPnLColor } from "@/lib/utils";
import { useConfig, usePositions, useScanner } from "@/lib/api";

import { BiasBadge } from "@/components/cards/BiasBadge";
import { MainLayout } from "@/components/layout/MainLayout";
import { PnLCard } from "@/components/cards/PnLCard";
import { Session } from "next-auth";

export default function DashboardData({
	session,
	logoutUserAction,
}: {
	session: Session | null;
	logoutUserAction: () => Promise<void>;
}) {
	const { data: positionsData, error: positionsError } = usePositions();
	const { data: scannerData, error: scannerError } = useScanner();
	const { data: configData, error: configError } = useConfig();

	const positions = positionsData?.positions || [];
	const scanner = scannerData?.scanner || [];
	const riskState = configData?.riskState;
	const riskLimit = configData?.riskLimit;

	const openPositions = positions.filter((p: any) => p.status === "OPEN");
	const totalPnL = openPositions.reduce(
		(sum: number, p: any) => sum + (p.pnl || 0),
		0
	);
	const dailyPnL = riskState?.dailyPnL || 0;
	const totalTrades = riskState?.dailyTrades || 0;
	const winRate =
		totalTrades > 0
			? ((totalTrades - (dailyPnL < 0 ? 1 : 0)) / totalTrades) * 100
			: 0;

	const currentPosition = openPositions.length > 0 ? openPositions[0] : null;
	const positionDirection = currentPosition?.direction || "FLAT";

	const getRiskStatus = () => {
		if (!riskLimit || !riskState)
			return { color: "text-gray-400", label: "UNKNOWN" };
		const dailyLoss = riskState.dailyPnL || 0;
		const maxLoss = riskLimit.maxDailyLoss || 1000;

		if (dailyLoss <= -maxLoss)
			return { color: "text-red-500", label: "LOCKED" };
		if (dailyLoss <= -maxLoss * 0.7)
			return { color: "text-yellow-500", label: "WARNING" };
		return { color: "text-green-500", label: "NORMAL" };
	};

	const riskStatus = getRiskStatus();

	return (
		<div className="p-6 space-y-6">
			<div>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Dashboard</h1>
						<p className="text-muted-foreground">
							Welcome back, {session?.user?.name || "Trader"}!
						</p>
					</div>

					<form action={logoutUserAction}>
						<button className="flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
							<PowerIcon className="w-6" />
							<div className="hidden md:block">Sign Out</div>
						</button>
					</form>
				</div>

				{(positionsError || scannerError || configError) && (
					<div className="text-sm text-yellow-500">
						Some data failed to load. Check{" "}
						<a href="/debug" className="underline">
							Debug page
						</a>
					</div>
				)}
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
				<PnLCard
					label="Open P&L"
					value={totalPnL}
					icon={totalPnL >= 0 ? "up" : "down"}
				/>
				<PnLCard
					label="Daily P&L"
					value={dailyPnL}
					icon={dailyPnL >= 0 ? "up" : "down"}
				/>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Trades
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalTrades}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Win Rate
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{winRate.toFixed(1)}%
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Risk Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${riskStatus.color}`}
						>
							{riskStatus.label}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Current Position State */}
				<Card>
					<CardHeader>
						<CardTitle>Current Position</CardTitle>
					</CardHeader>
					<CardContent>
						{currentPosition ? (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Direction
									</span>
									<div className="flex items-center gap-2">
										{positionDirection === "LONG" ? (
											<TrendingUp className="h-4 w-4 text-green-500" />
										) : (
											<TrendingDown className="h-4 w-4 text-red-500" />
										)}
										<span className="font-semibold">
											{positionDirection}
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Size
									</span>
									<span className="font-semibold">
										{currentPosition.quantity} contracts
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Entry Price
									</span>
									<span className="font-semibold">
										{formatCurrency(
											currentPosition.entryPrice
										)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Broker
									</span>
									<span className="font-semibold uppercase">
										{currentPosition.broker}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Unrealized P&L
									</span>
									<span
										className={`font-semibold ${getPnLColor(
											currentPosition.pnl
										)}`}
									>
										{formatCurrency(currentPosition.pnl)}
									</span>
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<p>No open positions</p>
								<p className="text-sm mt-2">FLAT</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Scanner Bias */}
				<Card>
					<CardHeader>
						<CardTitle>Scanner Bias</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Symbol</TableHead>
									<TableHead>Bias</TableHead>
									<TableHead>Updated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{scanner.length > 0 ? (
									scanner.map((item: any) => (
										<TableRow key={item.symbol}>
											<TableCell className="font-medium">
												{item.symbol}
											</TableCell>
											<TableCell>
												<BiasBadge bias={item.bias} />
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{item.timestamp
													? formatDate(item.timestamp)
													: "Never"}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={3}
											className="text-center text-muted-foreground"
										>
											No scanner data
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
