import React, { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import { RealizedMatch } from "../types";

interface TaxReportProps {
  realizedMatches: RealizedMatch[];
  currencySymbol: string;
  selectedYear: string;
}

export default function TaxReport({ realizedMatches, currencySymbol, selectedYear }: TaxReportProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Format currency Helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currencySymbol === "₹" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currencySymbol === "₹" ? "INR" : "USD",
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Filter realized matches by year
  const filteredMatches = realizedMatches.filter(m => {
    if (selectedYear === "All") return true;
    return new Date(m.sell_date).getFullYear().toString() === selectedYear;
  });

  const toggleRow = (idx: number) => {
    if (expandedRow === idx) {
      setExpandedRow(null);
    } else {
      setExpandedRow(idx);
    }
  };

  if (filteredMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-900 bg-[#111116]/40 rounded-2xl">
        <Info className="h-8 w-8 text-zinc-500 mb-3" />
        <h3 className="font-semibold text-white">No Realized Trades</h3>
        <p className="text-xs text-zinc-400 mt-1">
          {selectedYear === "All" 
            ? "Upload a CSV with Sell transactions to calculate realized FIFO matches." 
            : `No trades were closed in the tax year ${selectedYear}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-[#111115]/50 backdrop-blur-md">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-900 bg-[#141419]/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <th className="px-6 py-4 w-10"></th>
              <th className="px-6 py-4">Ticker</th>
              <th className="px-6 py-4">Sell Date</th>
              <th className="px-6 py-4 text-right">Shares Sold</th>
              <th className="px-6 py-4 text-right">Sell Price</th>
              <th className="px-6 py-4">Term</th>
              <th className="px-6 py-4 text-right">Holding Days</th>
              <th className="px-6 py-4 text-right">Wash Disallowed</th>
              <th className="px-6 py-4 text-right">Taxable P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50">
            {filteredMatches.map((m, idx) => {
              const isExpanded = expandedRow === idx;
              const isProfit = m.realized_pnl >= 0;
              const hasWashSale = m.wash_sale_disallowed > 0;
              
              return (
                <React.Fragment key={idx}>
                  <tr 
                    onClick={() => toggleRow(idx)}
                    className="hover:bg-[#15151b]/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-zinc-500">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </td>
                    <td className="px-6 py-4 font-bold text-white tracking-wide">{m.ticker}</td>
                    <td className="px-6 py-4 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{formatDate(m.sell_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">{m.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(m.sell_price)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.classification === "Long-Term" 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/15" 
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/15"
                      }`}>
                        {m.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">{m.holding_period_days} days</td>
                    <td className="px-6 py-4 text-right tabular-nums text-amber-500">
                      {hasWashSale ? (
                        <div className="flex items-center justify-end gap-1 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{formatCurrency(m.wash_sale_disallowed)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right tabular-nums font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(m.realized_pnl)}
                    </td>
                  </tr>

                  {/* Expandable Sublots match drawer */}
                  {isExpanded && (
                    <tr className="bg-[#121217]/50">
                      <td colSpan={9} className="px-8 py-4 border-t border-b border-zinc-900/50">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            FIFO Buy Lot Allocations ({m.matched_buys.length})
                          </h4>
                          <div className="overflow-hidden rounded-lg border border-zinc-900/70 bg-[#0d0d11]">
                            <table className="w-full text-xs text-zinc-400">
                              <thead>
                                <tr className="border-b border-zinc-900 bg-zinc-900/30 text-left font-semibold uppercase text-zinc-500">
                                  <th className="px-4 py-2">Buy Date</th>
                                  <th className="px-4 py-2 text-right">Qty Matched</th>
                                  <th className="px-4 py-2 text-right">Buy Price (Cost)</th>
                                  <th className="px-4 py-2 text-right">Realized Gain/Loss</th>
                                  <th className="px-4 py-2 text-right">Wash Disallowed</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-900/50">
                                {m.matched_buys.map((b, bIdx) => (
                                  <tr key={bIdx} className="hover:bg-zinc-900/10">
                                    <td className="px-4 py-2 font-medium">{formatDate(b.buy_date)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{b.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(b.buy_price)}</td>
                                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${b.realized_gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {formatCurrency(b.realized_gain)}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums text-amber-500">
                                      {b.wash_sale_disallowed > 0 ? formatCurrency(b.wash_sale_disallowed) : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
