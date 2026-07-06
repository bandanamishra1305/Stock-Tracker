import yfinance as yf
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timezone

# Common Indian Equities from Sample CSV to auto-append .NS
INDIAN_TICKERS = {"ICICIBANK", "RELIANCE", "TCS", "SBIN", "INFY", "ITC", "HDFCBANK"}

def clean_ticker(ticker: str) -> str:
    ticker_upper = ticker.strip().upper()
    # If it already has a suffix like .NS or .BO, leave it
    if "." in ticker_upper:
        return ticker_upper
    # Auto-append .NS if it is in our Indian equities list
    if ticker_upper in INDIAN_TICKERS:
        return f"{ticker_upper}.NS"
    # Otherwise, return as is (could be US ticker like AAPL, NVDA)
    return ticker_upper

async def get_live_prices(tickers: List[str]) -> Dict[str, float]:
    prices = {}
    
    # We will fetch sequentially with small sleeps to avoid rate limiting
    for ticker in tickers:
        cleaned = clean_ticker(ticker)
        try:
            # Run yfinance blocking calls in an executor thread
            loop = asyncio.get_event_loop()
            t = await loop.run_in_executor(None, lambda: yf.Ticker(cleaned))
            
            # Retrieve regular market price
            # yfinance sometimes populates info, other times fast_info is better and faster
            info = await loop.run_in_executor(None, lambda: t.fast_info)
            price = info.get("lastPrice")
            
            # Fallback to history close if lastPrice is not found
            if price is None or price <= 0:
                hist = await loop.run_in_executor(None, lambda: t.history(period="1d"))
                if not hist.empty:
                    price = float(hist["Close"].iloc[-1])
            
            if price is not None and price > 0:
                prices[ticker] = price
                print(f"[Finance] Live Price for {ticker} ({cleaned}): {price}")
            else:
                prices[ticker] = None
        except Exception as e:
            print(f"[Finance Error] Failed to fetch live price for {ticker}: {e}")
            prices[ticker] = None
            
        await asyncio.sleep(0.1) # small delay
        
    return prices

async def get_split_histories(tickers: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns split events for each ticker.
    Each event has:
      'date': datetime (UTC timezone-aware)
      'ratio': float (the multiplier for quantities, e.g. 10.0 for a 10-for-1 split)
    """
    splits_dict = {}
    
    for ticker in tickers:
        cleaned = clean_ticker(ticker)
        splits_dict[ticker] = []
        try:
            loop = asyncio.get_event_loop()
            t = await loop.run_in_executor(None, lambda: yf.Ticker(cleaned))
            splits_series = await loop.run_in_executor(None, lambda: t.splits)
            
            if splits_series is not None and not splits_series.empty:
                for date, ratio in splits_series.items():
                    # Ensure date is timezone aware in UTC
                    dt = date.to_pydatetime()
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    else:
                        dt = dt.astimezone(timezone.utc)
                        
                    splits_dict[ticker].append({
                        "date": dt,
                        "ratio": float(ratio)
                    })
                # Sort splits chronologically
                splits_dict[ticker].sort(key=lambda x: x["date"])
                print(f"[Finance] Found {len(splits_dict[ticker])} splits for {ticker}")
        except Exception as e:
            print(f"[Finance Error] Failed to fetch splits for {ticker}: {e}")
            
        await asyncio.sleep(0.1)
        
    return splits_dict
