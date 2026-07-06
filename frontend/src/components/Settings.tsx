import React, { useState } from "react";
import { Sliders, Check, HelpCircle } from "lucide-react";
import { TaxRatesConfig } from "../types";

interface SettingsProps {
  config: TaxRatesConfig;
  onSave: (newConfig: TaxRatesConfig) => void;
}

export default function Settings({ config, onSave }: SettingsProps) {
  const [isUsTax, setIsUsTax] = useState(config.is_us_tax);
  
  // US Specific settings states
  const [usStRate, setUsStRate] = useState((config.st_rate * 100).toString());
  const [usLtRate, setUsLtRate] = useState((config.lt_rate * 100).toString());
  const [niitThreshold, setNiitThreshold] = useState(config.niit_threshold.toString());
  const [niitRate, setNiitRate] = useState((config.niit_rate * 100).toString());
  
  // India Specific settings states
  // We keep default India STCG as 20% and LTCG as 12.5% (or allow changing them)
  const [inStRate, setInStRate] = useState(isUsTax ? "20" : (config.st_rate * 100).toString());
  const [inLtRate, setInLtRate] = useState(isUsTax ? "12.5" : (config.lt_rate * 100).toString());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newConfig: TaxRatesConfig = {
      is_us_tax: isUsTax,
      st_rate: isUsTax ? (parseFloat(usStRate) / 100) : (parseFloat(inStRate) / 100),
      lt_rate: isUsTax ? (parseFloat(usLtRate) / 100) : (parseFloat(inLtRate) / 100),
      niit_threshold: isUsTax ? parseFloat(niitThreshold) : 125000.0, // Defaults to 1.25L exemption threshold in India
      niit_rate: isUsTax ? (parseFloat(niitRate) / 100) : 0.0,
    };
    
    onSave(newConfig);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="glass-panel rounded-2xl border border-zinc-900 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Tax Accounting Configurations</h3>
            <p className="text-xs text-zinc-500">Configure parameters for capital gains tax calculations</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Tax Region Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Tax Jurisdiction / Region
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsUsTax(true)}
                className={`flex flex-col items-center justify-center rounded-xl p-4 border text-center transition-all ${
                  isUsTax 
                    ? "border-emerald-500 bg-emerald-500/5 text-white" 
                    : "border-zinc-800 bg-[#121216]/50 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span className="text-sm font-bold">United States ($)</span>
                <span className="text-[10px] text-zinc-500 mt-1">IRS FIFO & Wash Sale Rules</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIsUsTax(false)}
                className={`flex flex-col items-center justify-center rounded-xl p-4 border text-center transition-all ${
                  !isUsTax 
                    ? "border-emerald-500 bg-emerald-500/5 text-white" 
                    : "border-zinc-800 bg-[#121216]/50 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span className="text-sm font-bold">India (₹)</span>
                <span className="text-[10px] text-zinc-500 mt-1">STCG / LTCG Exemption Rules</span>
              </button>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* Configuration Inputs */}
          {isUsTax ? (
            /* US Settings Inputs */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Short-Term Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={usStRate}
                    onChange={(e) => setUsStRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Taxed at ordinary income brackets</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Long-Term Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={usLtRate}
                    onChange={(e) => setUsLtRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Typically 15% or 20%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">NIIT Income Threshold ($)</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={niitThreshold}
                    onChange={(e) => setNiitThreshold(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Usually $200k (Single) / $250k (Married)</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-400">NIIT Surcharge Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="100"
                    value={niitRate}
                    onChange={(e) => setNiitRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Standard Net Investment Income Tax is 3.8%</p>
                </div>
              </div>
            </div>
          ) : (
            /* India Settings Inputs */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">STCG Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={inStRate}
                    onChange={(e) => setInStRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Short-Term capital gains (usually 20%)</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-400">LTCG Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={inLtRate}
                    onChange={(e) => setInLtRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Long-Term capital gains (usually 12.5%)</p>
                </div>
              </div>
              
              <div className="rounded-lg border border-zinc-800 bg-[#111116]/40 p-4 flex gap-3 text-xs text-zinc-400">
                <HelpCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">India Tax Relief Rule Enabled</p>
                  <p className="mt-1 leading-relaxed">
                    Under Indian tax regulations, LTCG gains are exempt from tax up to an annual limit of **₹125,000**. The engine will automatically deduct this exemption before computing your LTCG tax liabilities.
                  </p>
                </div>
              </div>
            </div>
          )}

          <hr className="border-zinc-900" />

          {/* Submit button */}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none"
          >
            <Check className="h-4 w-4" />
            Apply & Recalculate Portfolio
          </button>
        </form>
      </div>
    </div>
  );
}
