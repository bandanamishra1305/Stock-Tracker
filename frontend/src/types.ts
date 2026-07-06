export interface Transaction {
  id: number;
  activity_date: string;
  process_date: string;
  settle_date: string;
  instrument: string;
  description: string;
  trans_code: 'Buy' | 'Sell' | 'CDIV';
  quantity: number;
  price: number;
  amount: number;
  created_at: string;
}

export interface MatchedBuy {
  buy_date: string;
  buy_price: number;
  quantity: number;
  realized_gain: number;
  wash_sale_disallowed: number;
}

export interface RealizedMatch {
  ticker: string;
  sell_date: string;
  sell_price: number;
  quantity: number;
  realized_pnl: number;
  matched_buys: MatchedBuy[];
  wash_sale_disallowed: number;
  holding_period_days: number;
  classification: 'Short-Term' | 'Long-Term';
}

export interface Holding {
  ticker: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  current_value: number;
  invested_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;
  dividends: number;
}

export interface PortfolioSummary {
  total_portfolio_value: number;
  total_invested_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_dividends: number;
  total_wash_sale_disallowed: number;
  total_tax_liability: number;
  total_return: number;
  total_return_percent: number;
}

export interface PortfolioData {
  holdings: Holding[];
  realized_matches: RealizedMatch[];
  summary: PortfolioSummary;
}

export interface TaxRatesConfig {
  is_us_tax: boolean;
  st_rate: number;
  lt_rate: number;
  niit_threshold: number;
  niit_rate: number;
}
