"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Holding } from "../types";
import { Info } from "lucide-react";

interface ChartsProps {
  holdings: Holding[];
  currencySymbol: string;
}

const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#64748b"  // Slate
];

export default function Charts({ holdings, currencySymbol }: ChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format currency Helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currencySymbol === "₹" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currencySymbol === "₹" ? "INR" : "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  const activeHoldings = holdings.filter(h => h.quantity > 0);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-xl bg-zinc-900/20 border border-zinc-900 shimmer" />
        <div className="h-80 rounded-xl bg-zinc-900/20 border border-zinc-900 shimmer" />
      </div>
    );
  }

  if (activeHoldings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-900 bg-[#111116]/40 rounded-2xl">
        <Info className="h-8 w-8 text-zinc-500 mb-3" />
        <h3 className="font-semibold text-white">No Financial Charts Available</h3>
        <p className="text-xs text-zinc-400 mt-1">Upload a CSV to view asset allocations and returns metrics.</p>
      </div>
    );
  }

  // Allocation Chart Data mapping
  const allocationData = activeHoldings.map(h => ({
    name: h.ticker,
    value: h.current_value
  })).sort((a, b) => b.value - a.value);

  // Return Chart Data mapping (P&L Breakdown)
  // Shows both realized and unrealized P&L
  const pnlData = holdings.map(h => ({
    name: h.ticker,
    "Unrealized P&L": h.unrealized_pnl,
    "Realized P&L": h.realized_pnl
  })).filter(item => item["Unrealized P&L"] !== 0 || item["Realized P&L"] !== 0);

  // Custom tooltips
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-zinc-800 bg-[#0d0d12]/90 p-3 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase">{payload[0].name}</p>
          <p className="text-sm font-semibold text-emerald-400 mt-1">
            Value: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-zinc-800 bg-[#0d0d12]/90 p-3 shadow-xl backdrop-blur-sm space-y-1">
          <p className="text-xs font-bold text-zinc-400 uppercase">{label}</p>
          {payload.map((item: any, idx: number) => {
            const isProfit = item.value >= 0;
            return (
              <p key={idx} className={`text-xs font-medium ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                {item.name}: {formatCurrency(item.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Asset Allocation Chart */}
      <div className="glass-panel rounded-2xl border border-zinc-900 p-6 flex flex-col">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-6">Asset Allocation</h3>
        <div className="h-72 w-full flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", color: "#e4e4e7" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Breakdown Chart */}
      <div className="glass-panel rounded-2xl border border-zinc-900 p-6 flex flex-col">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-6">Realized & Unrealized P&L</h3>
        <div className="h-72 w-full flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pnlData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#181822" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#111116", opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#e4e4e7" }} />
              <Bar dataKey="Unrealized P&L" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realized P&L" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
