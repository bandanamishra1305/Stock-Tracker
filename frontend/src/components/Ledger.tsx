import React from "react";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Gift, Info } from "lucide-react";
import { Transaction } from "../types";

interface LedgerProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function Ledger({ transactions, currencySymbol }: LedgerProps) {
  // Format currency Helper
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat(currencySymbol === "₹" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currencySymbol === "₹" ? "INR" : "USD",
      maximumFractionDigits: 2
    }).format(Math.abs(val));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-900 bg-[#111116]/40 rounded-2xl">
        <Info className="h-8 w-8 text-zinc-500 mb-3" />
        <h3 className="font-semibold text-white">Transaction Log Empty</h3>
        <p className="text-xs text-zinc-400 mt-1">Upload your brokerage CSV to populate the transaction history.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-[#111115]/50 backdrop-blur-md">
      <table className="w-full min-w-[750px] border-collapse text-left text-sm text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-900 bg-[#141419]/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Ticker</th>
            <th className="px-6 py-4">Execution Type</th>
            <th className="px-6 py-4 text-right">Quantity</th>
            <th className="px-6 py-4 text-right">Execution Price</th>
            <th className="px-6 py-4 text-right">Total Amount</th>
            <th className="px-6 py-4">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50">
          {transactions.map((tx) => {
            const isBuy = tx.trans_code === "Buy";
            const isSell = tx.trans_code === "Sell";
            const isDiv = tx.trans_code === "CDIV";
            
            return (
              <tr key={tx.id} className="hover:bg-[#15151b]/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap tabular-nums">{formatDate(tx.activity_date)}</td>
                <td className="px-6 py-4 font-bold text-white tracking-wide">{tx.instrument}</td>
                <td className="px-6 py-4">
                  {isBuy && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      <ArrowDownLeft className="h-3 w-3" />
                      Buy
                    </span>
                  )}
                  {isSell && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-xs font-semibold text-red-400">
                      <ArrowUpRight className="h-3 w-3" />
                      Sell
                    </span>
                  )}
                  {isDiv && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      <Gift className="h-3 w-3" />
                      Dividend
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {isDiv ? (
                    <span className="text-zinc-600">—</span>
                  ) : (
                    tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })
                  )}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {isDiv ? (
                    <span className="text-zinc-600">—</span>
                  ) : (
                    formatCurrency(tx.price)
                  )}
                </td>
                <td className={`px-6 py-4 text-right tabular-nums font-semibold ${
                  isBuy ? "text-red-400" : "text-emerald-400"
                }`}>
                  {formatCurrency(tx.amount)}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500 font-medium max-w-xs truncate" title={tx.description}>
                  {tx.description}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
