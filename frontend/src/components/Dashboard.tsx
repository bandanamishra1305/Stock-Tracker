import React, { useState, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Coins, 
  Percent, 
  Briefcase, 
  RefreshCw, 
  Search, 
  FileSpreadsheet, 
  Sliders,
  DollarSign,
  HelpCircle
} from "lucide-react";
import { PortfolioData, TaxRatesConfig } from "../types";

interface DashboardProps {
  portfolio: PortfolioData;
  currencySymbol: string;
  taxRates: TaxRatesConfig;
  onRefresh: () => void;
  onUploadFile: (file: File) => void;
  uploading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  children: React.ReactNode;
}

export default function Dashboard({
  portfolio,
  currencySymbol,
  taxRates,
  onRefresh,
  onUploadFile,
  uploading,
  activeTab,
  setActiveTab,
  selectedYear,
  setSelectedYear,
  searchQuery,
  setSearchQuery,
  children
}: DashboardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Find unique years in realized matches for filtering
  const yearsSet = new Set<string>();
  portfolio.realized_matches.forEach(m => {
    const year = new Date(m.sell_date).getFullYear().toString();
    yearsSet.add(year);
  });
  const availableYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  const summary = portfolio.summary;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0f] text-zinc-100">
      {/* Navbar Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-900 bg-[#0b0b0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">StockTrack</h1>
              <p className="text-xs text-zinc-500">Robinhood Portfolio & Tax Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-[#121216] text-zinc-400 hover:text-emerald-400 transition"
              title="Refresh quote values"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={triggerFileSelect}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Drag & Drop Upload Zone (Shown if portfolio has no data) */}
        {portfolio.holdings.length === 0 && portfolio.realized_matches.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDragOver 
                ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10 shadow-inner" 
                : "border-zinc-800 bg-[#111116]/40 hover:border-zinc-700"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                <p className="text-sm text-zinc-400">Processing file & mapping FIFO lots...</p>
              </div>
            ) : (
              <div className="max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-6">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Import Brokerage Transactions</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Drag & drop your Robinhood or Indian Equities CSV ledger file here, or click to browse files.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Supports buy/sell matching, stock splits, and dividends.</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Portfolio Dashboard */
          <div className="space-y-8 fade-in">
            {/* Top Row: Year Filter and Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[#111115]/50 border border-zinc-900 p-4 rounded-xl">
              {/* Year Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">Tax Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-[#141419] px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                >
                  <option value="All">All Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Ticker Search */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search Tickers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-[#141419] py-1.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Portfolio Value */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Net Portfolio Value</span>
                  <Briefcase className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight glow-text-blue">
                  {formatCurrency(summary.total_portfolio_value)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Live position values</p>
              </div>

              {/* Invested Capital */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Invested Capital</span>
                  <DollarSign className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCurrency(summary.total_invested_value)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Adjusted average cost basis</p>
              </div>

              {/* Unrealized P&L */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Unrealized P&L</span>
                  {summary.total_unrealized_pnl >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${
                  summary.total_unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {formatCurrency(summary.total_unrealized_pnl)}
                </div>
                <p className={`mt-1 text-xs font-semibold ${
                  summary.total_unrealized_pnl >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                  {formatPercent(summary.total_invested_value > 0 ? (summary.total_unrealized_pnl / summary.total_invested_value) * 100 : 0)} return
                </p>
              </div>

              {/* Realized Capital Gains */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Realized P&L</span>
                  <Coins className="h-5 w-5 text-zinc-400" />
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${
                  summary.total_realized_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {formatCurrency(summary.total_realized_pnl)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {selectedYear === "All" ? "Across all closed positions" : `Tax year ${selectedYear} gains`}
                </p>
              </div>

              {/* Wash Sales Disallowed */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Wash Sale Disallowed</span>
                  <Percent className="h-5 w-5 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-amber-500 tracking-tight">
                  {formatCurrency(summary.total_wash_sale_disallowed)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Basis-adjusted disallowed losses</p>
              </div>

              {/* Est. Tax Liability */}
              <div className="glass-panel rounded-2xl border border-zinc-900 p-6 glow-card">
                <div className="flex items-center justify-between text-zinc-500 mb-3">
                  <span className="text-sm font-semibold tracking-wider uppercase">Est. Tax Liability</span>
                  <Sliders className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 tracking-tight glow-text-green">
                  {formatCurrency(summary.total_tax_liability)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Based on custom config settings
                </p>
              </div>
            </div>

            {/* Tab Navigation links */}
            <div className="border-b border-zinc-900">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: "holdings", name: "Active Holdings" },
                  { id: "fifo", name: "FIFO Matches & Wash Sales" },
                  { id: "charts", name: "Analytical Charts" },
                  { id: "ledger", name: "Transaction Ledger" },
                  { id: "settings", name: "Tax Engine Config" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap pb-4 text-sm font-semibold border-b-2 transition ${
                      activeTab === tab.id
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Contents */}
            <div className="mt-4">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
