"use client";

import React, { useState, useEffect } from "react";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import Holdings from "../components/Holdings";
import TaxReport from "../components/TaxReport";
import Charts from "../components/Charts";
import Ledger from "../components/Ledger";
import Settings from "../components/Settings";
import { PortfolioData, Transaction, TaxRatesConfig } from "../types";
import { LogOut, Info } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard configuration states
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState("holdings");
  const [selectedYear, setSelectedYear] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [taxRates, setTaxRates] = useState<TaxRatesConfig>({
    is_us_tax: true,
    st_rate: 0.24,
    lt_rate: 0.15,
    niit_threshold: 200000.0,
    niit_rate: 0.038
  });

  // Verify auth on startup
  useEffect(() => {
    const storedToken = localStorage.getItem("stocktrack_token");
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setAuthenticated(true);
        fetchData(authToken, taxRates);
      } else {
        // Clear expired token
        localStorage.removeItem("stocktrack_token");
        setToken(null);
        setAuthenticated(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth verification failed", err);
      setLoading(false);
    }
  };

  const fetchData = async (authToken: string, config: TaxRatesConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      // Construct url parameters for tax rates
      const params = new URLSearchParams({
        is_us_tax: config.is_us_tax.toString(),
        st_rate: config.st_rate.toString(),
        lt_rate: config.lt_rate.toString(),
        niit_threshold: config.niit_threshold.toString(),
        niit_rate: config.niit_rate.toString()
      });

      // 1. Fetch Portfolio Metrics
      const portRes = await fetch(`${API_BASE}/api/portfolio?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!portRes.ok) throw new Error("Failed to load portfolio metrics.");
      const portData = await portRes.json();
      setPortfolio(portData);

      // 2. Fetch Raw Transactions
      const txRes = await fetch(`${API_BASE}/api/transactions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem("stocktrack_token", newToken);
    setToken(newToken);
    setAuthenticated(true);
    fetchData(newToken, taxRates);
  };

  const handleLogout = () => {
    localStorage.removeItem("stocktrack_token");
    setToken(null);
    setAuthenticated(false);
    setPortfolio(null);
    setTransactions([]);
  };

  const handleUploadFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to ingest transactions CSV.");
      }

      await fetchData(token, taxRates);
      setActiveTab("holdings");
    } catch (err: any) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfig = (newConfig: TaxRatesConfig) => {
    setTaxRates(newConfig);
    if (token) {
      fetchData(token, newConfig);
    }
  };

  const handleRefresh = () => {
    if (token) {
      fetchData(token, taxRates);
    }
  };

  // Filter lists based on search query
  const getFilteredHoldings = () => {
    if (!portfolio) return [];
    return portfolio.holdings.filter(h => 
      h.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => 
      t.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trans_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const currencySymbol = taxRates.is_us_tax ? "$" : "₹";

  if (loading && !portfolio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mb-4" />
        <p className="text-sm text-zinc-400">Loading StockTrack dashboard engine...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} apiBaseUrl={API_BASE} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex flex-col justify-between">
      <div>
        {/* Error Notification banner */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 py-3 px-4 text-sm flex items-center justify-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {portfolio && (
          <Dashboard
            portfolio={portfolio}
            currencySymbol={currencySymbol}
            taxRates={taxRates}
            onRefresh={handleRefresh}
            onUploadFile={handleUploadFile}
            uploading={uploading}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          >
            {activeTab === "holdings" && (
              <Holdings 
                holdings={getFilteredHoldings()} 
                currencySymbol={currencySymbol} 
              />
            )}
            
            {activeTab === "fifo" && (
              <TaxReport
                realizedMatches={portfolio.realized_matches}
                currencySymbol={currencySymbol}
                selectedYear={selectedYear}
              />
            )}
            
            {activeTab === "charts" && (
              <Charts 
                holdings={getFilteredHoldings()} 
                currencySymbol={currencySymbol} 
              />
            )}
            
            {activeTab === "ledger" && (
              <Ledger 
                transactions={getFilteredTransactions()} 
                currencySymbol={currencySymbol} 
              />
            )}
            
            {activeTab === "settings" && (
              <Settings 
                config={taxRates} 
                onSave={handleSaveConfig} 
              />
            )}
          </Dashboard>
        )}
      </div>

      {/* Floating Logout Button */}
      <footer className="py-8 bg-[#0b0b0f] text-center border-t border-zinc-950 flex items-center justify-center gap-6">
        <p className="text-xs text-zinc-600">StockTrack Dashboard Console</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#121216] px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout Admin Session
        </button>
      </footer>
    </div>
  );
}
