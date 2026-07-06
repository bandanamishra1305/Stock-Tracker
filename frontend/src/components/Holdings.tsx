import React from "react";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { Holding } from "../types";

interface HoldingsProps {
  holdings: Holding[];
  currencySymbol: string;
}

export default function Holdings({ holdings, currencySymbol }: HoldingsProps) {
  // Format currency Helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currencySymbol === "₹" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currencySymbol === "₹" ? "INR" : "USD",
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatPercent = (val: number) => {
    return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
  };

  // Only show holdings that have non-zero quantities (active open positions)
  const activeHoldings = holdings.filter(h => h.quantity > 0);

  if (activeHoldings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-900 bg-[#111116]/40 rounded-2xl">
        <Info className="h-8 w-8 text-zinc-500 mb-3" />
        <h3 className="font-semibold text-white">No Open Positions</h3>
        <p className="text-xs text-zinc-400 mt-1">Upload a CSV file containing BUY executions to list holdings.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-[#111115]/50 backdrop-blur-md">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-900 bg-[#141419]/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <th className="px-6 py-4">Ticker</th>
            <th className="px-6 py-4 text-right">Shares Owned</th>
            <th className="px-6 py-4 text-right">Avg Buy Price</th>
            <th className="px-6 py-4 text-right">Live Price</th>
            <th className="px-6 py-4 text-right">Invested Value</th>
            <th className="px-6 py-4 text-right">Market Value</th>
            <th className="px-6 py-4 text-right">Unrealized P&L</th>
            <th className="px-6 py-4 text-right">Dividends</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50">
          {activeHoldings.map((h) => {
            const isProfit = h.unrealized_pnl >= 0;
            return (
              <tr key={h.ticker} className="hover:bg-[#15151b]/40 transition-colors">
                <td className="px-6 py-4 font-bold text-white tracking-wide">{h.ticker}</td>
                <td className="px-6 py-4 text-right tabular-nums">{h.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(h.average_buy_price)}</td>
                <td className="px-6 py-4 text-right tabular-nums text-emerald-400/90">{formatCurrency(h.current_price)}</td>
                <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(h.invested_value)}</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold text-white">{formatCurrency(h.current_value)}</td>
                <td className={`px-6 py-4 text-right tabular-nums font-semibold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                  <div className="flex items-center justify-end gap-1">
                    {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{formatCurrency(h.unrealized_pnl)}</span>
                    <span className="text-xs font-normal">({formatPercent(h.unrealized_pnl_percent)})</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-emerald-500 font-medium">{formatCurrency(h.dividends)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
