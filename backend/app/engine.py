from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from app.schemas import PortfolioDataResponse, HoldingResponse, RealizedMatchResponse, MatchedBuyResponse, SummaryResponse

def calculate_portfolio(transactions_db: List[Any], live_prices: Dict[str, float], splits_dict: Dict[str, List[Dict[str, Any]]], tax_rates: Dict[str, Any] = None) -> Dict[str, Any]:
    if not tax_rates:
        # Default US Tax Rates
        tax_rates = {
            "is_us_tax": True,
            "st_rate": 0.24, # 24% Ordinary income rate default
            "lt_rate": 0.15, # 15% Long-term rate default
            "niit_threshold": 200000.0,
            "niit_rate": 0.038
        }
    
    # 1. Clean and convert DB models to dictionaries to avoid mutating database states
    transactions = []
    for tx in transactions_db:
        # Ensure dates are timezone-aware in UTC
        act_date = tx.activity_date
        if act_date.tzinfo is None:
            act_date = act_date.replace(tzinfo=timezone.utc)
        
        proc_date = tx.process_date
        if proc_date and proc_date.tzinfo is None:
            proc_date = proc_date.replace(tzinfo=timezone.utc)
            
        settle_date = tx.settle_date
        if settle_date and settle_date.tzinfo is None:
            settle_date = settle_date.replace(tzinfo=timezone.utc)

        transactions.append({
            "id": tx.id,
            "activity_date": act_date,
            "process_date": proc_date,
            "settle_date": settle_date,
            "instrument": tx.instrument,
            "description": tx.description or "",
            "trans_code": tx.trans_code,
            "quantity": tx.quantity,
            "price": tx.price,
            "amount": tx.amount,
            "original_qty": tx.quantity, # track for wash sales
            "original_price": tx.price
        })

    # Sort transactions chronologically (oldest first)
    transactions.sort(key=lambda x: x["activity_date"])

    # 2. Apply Corporate Actions (Stock Splits)
    # Adjusts transaction quantity and price retroactively before calculating FIFO
    for ticker, splits in splits_dict.items():
        for split in splits:
            split_date = split["date"]
            split_ratio = split["ratio"] # e.g. 10.0 for 10-for-1
            
            for tx in transactions:
                if tx["instrument"] == ticker and tx["activity_date"] < split_date:
                    tx["quantity"] = tx["quantity"] * split_ratio
                    tx["price"] = tx["price"] / split_ratio
                    # Amount remains the same, but quantity and price adjust.

    # 3. Pre-calculate Wash Sale Replacements
    # To disallow a loss, there must be a replacement purchase within [sell_date - 30, sell_date + 30]
    # We will track the "available capacity" of each Buy transaction to serve as a wash sale replacement.
    buy_capacities = {} # key: transaction ID, value: remaining quantity available to match wash sale
    for tx in transactions:
        if tx["trans_code"] == "Buy":
            buy_capacities[tx["id"]] = tx["quantity"]

    # 4. Run FIFO Matching Engine
    holdings = {}
    realized_matches = []
    
    # Store list of active buy lots in queue for each instrument
    # Each lot: {'tx_id': int, 'date': datetime, 'quantity': float, 'price': float, 'original_price': float}
    buy_queues = {} 
    
    # Track basis adjustments to apply to buys when we process them
    # key: tx_id, value: accumulated cost basis increase
    basis_adjustments = {}

    for tx in transactions:
        ticker = tx["instrument"]
        tx_id = tx["id"]
        
        if ticker not in holdings:
            holdings[ticker] = {
                "ticker": ticker,
                "quantity": 0.0,
                "total_buy_cost": 0.0,
                "average_buy_price": 0.0,
                "realized_pnl": 0.0,
                "dividends": 0.0,
                "last_price": 0.0
            }
            buy_queues[ticker] = []

        stock = holdings[ticker]
        qty = tx["quantity"]
        price = tx["price"]
        amount = tx["amount"]
        date = tx["activity_date"]

        if tx["trans_code"] == "Buy":
            # Apply any wash sale basis adjustments registered for this buy transaction
            adj = basis_adjustments.get(tx_id, 0.0)
            adjusted_price = price + (adj / qty) if qty > 0 else price
            
            stock["quantity"] += qty
            stock["total_buy_cost"] += qty * adjusted_price
            
            buy_queues[ticker].append({
                "tx_id": tx_id,
                "date": date,
                "quantity": qty,
                "original_qty": qty,
                "price": adjusted_price,
                "original_price": price
            })
            
            stock["average_buy_price"] = stock["total_buy_cost"] / stock["quantity"] if stock["quantity"] > 0 else 0.0
            stock["last_price"] = price # fallback price
            
        elif tx["trans_code"] == "Sell":
            qty_to_sell = qty
            realized_pnl = 0.0
            total_wash_disallowed = 0.0
            matched_buys = []
            
            # Match against oldest buy lots in queue
            while qty_to_sell > 0 and len(buy_queues[ticker]) > 0:
                oldest_buy = buy_queues[ticker][0]
                matched_qty = min(qty_to_sell, oldest_buy["quantity"])
                
                buy_cost = matched_qty * oldest_buy["price"]
                sell_proceeds = matched_qty * price
                raw_gain = sell_proceeds - buy_cost
                
                # Check for holding period
                holding_days = (date - oldest_buy["date"]).days
                classification = "Long-Term" if holding_days > 365 else "Short-Term"
                
                wash_disallowed = 0.0
                # Wash Sale Check: If this match yields a loss
                if raw_gain < 0:
                    # Find a replacement buy within 30 days before/after sell_date
                    # Search chronologically in all transactions
                    for rep_tx in transactions:
                        if rep_tx["trans_code"] != "Buy" or rep_tx["instrument"] != ticker:
                            continue
                        
                        days_diff = abs((rep_tx["activity_date"] - date).days)
                        if days_diff <= 30:
                            # Verify if this replacement buy has remaining capacity
                            rep_id = rep_tx["id"]
                            avail_cap = buy_capacities.get(rep_id, 0.0)
                            
                            if avail_cap > 0:
                                # We can match up to the min of matched_qty or remaining replacement capacity
                                wash_match_qty = min(matched_qty, avail_cap)
                                wash_loss = abs((wash_match_qty / matched_qty) * raw_gain)
                                
                                wash_disallowed += wash_loss
                                buy_capacities[rep_id] -= wash_match_qty
                                
                                # Add the disallowed loss to the replacement buy cost basis
                                # If the replacement buy was already added to our queue, adjust it now.
                                # Otherwise, register it in basis_adjustments so it is applied when the buy is processed.
                                found_in_queue = False
                                for b_lot in buy_queues[ticker]:
                                    if b_lot["tx_id"] == rep_id:
                                        # Adjust the price in queue
                                        b_lot["price"] += wash_loss / b_lot["original_qty"]
                                        found_in_queue = True
                                        break
                                        
                                if not found_in_queue:
                                    basis_adjustments[rep_id] = basis_adjustments.get(rep_id, 0.0) + wash_loss
                                    
                                # Break if we fully matched this lot's wash sale capacity
                                matched_qty_remaining = oldest_buy["quantity"] - matched_qty
                                break
                
                # Tax P&L = Raw P&L + disallowed wash sale losses (making it 0 if fully disallowed)
                taxable_gain = raw_gain + wash_disallowed
                realized_pnl += taxable_gain
                total_wash_disallowed += wash_disallowed
                
                matched_buys.append(MatchedBuyResponse(
                    buy_date=oldest_buy["date"],
                    buy_price=oldest_buy["price"],
                    quantity=matched_qty,
                    realized_gain=taxable_gain,
                    wash_sale_disallowed=wash_disallowed
                ))
                
                oldest_buy["quantity"] -= matched_qty
                qty_to_sell -= matched_qty
                
                if oldest_buy["quantity"] <= 0:
                    buy_queues[ticker].pop(0)
            
            # Fallback for short-sells or incomplete buy records
            if qty_to_sell > 0:
                matched_buys.append(MatchedBuyResponse(
                    buy_date=date,
                    buy_price=price,
                    quantity=qty_to_sell,
                    realized_gain=0.0
                ))
                
            stock["quantity"] -= qty
            if stock["quantity"] <= 0:
                stock["quantity"] = 0.0
                stock["total_buy_cost"] = 0.0
                stock["average_buy_price"] = 0.0
                buy_queues[ticker] = []
            else:
                stock["total_buy_cost"] = sum(item["quantity"] * item["price"] for item in buy_queues[ticker])
                stock["average_buy_price"] = stock["total_buy_cost"] / stock["quantity"]
                
            stock["realized_pnl"] += realized_pnl
            stock["last_price"] = price
            
            # holding period classification for the whole sell
            days_diff = (date - matched_buys[0].buy_date).days if matched_buys else 0
            overall_classification = "Long-Term" if days_diff > 365 else "Short-Term"
            
            realized_matches.append(RealizedMatchResponse(
                ticker=ticker,
                sell_date=date,
                sell_price=price,
                quantity=qty,
                realized_pnl=realized_pnl,
                matched_buys=matched_buys,
                wash_sale_disallowed=total_wash_disallowed,
                holding_period_days=days_diff,
                classification=overall_classification
            ))
            
        elif tx["trans_code"] == "CDIV":
            stock["dividends"] += abs(amount)

    # 5. Compile Holdings List and Summaries
    holdings_list = []
    total_portfolio_value = 0.0
    total_invested_value = 0.0
    total_realized_pnl = 0.0
    total_dividends = 0.0
    total_wash_sale_disallowed = 0.0
    
    # Realized P&L breakdowns for tax calculations
    total_st_realized = 0.0
    total_lt_realized = 0.0

    for m in realized_matches:
        total_realized_pnl += m.realized_pnl
        total_wash_sale_disallowed += m.wash_sale_disallowed
        if m.classification == "Long-Term":
            total_lt_realized += m.realized_pnl
        else:
            total_st_realized += m.realized_pnl

    for ticker, stock in holdings.items():
        live_price = live_prices.get(ticker)
        if live_price is None or live_price <= 0:
            live_price = stock["last_price"]
            
        qty = stock["quantity"]
        avg_price = stock["average_buy_price"]
        current_value = qty * live_price
        invested_value = qty * avg_price
        unrealized_pnl = current_value - invested_value
        unrealized_pnl_percent = (unrealized_pnl / invested_value * 100) if invested_value > 0 else 0.0
        
        total_dividends += stock["dividends"]
        
        if qty > 0:
            total_portfolio_value += current_value
            total_invested_value += invested_value
            
        if qty > 0 or stock["realized_pnl"] != 0 or stock["dividends"] > 0:
            holdings_list.append(HoldingResponse(
                ticker=ticker,
                quantity=qty,
                average_buy_price=avg_price,
                current_price=live_price,
                current_value=current_value,
                invested_value=invested_value,
                unrealized_pnl=unrealized_pnl,
                unrealized_pnl_percent=unrealized_pnl_percent,
                realized_pnl=stock["realized_pnl"],
                dividends=stock["dividends"]
            ))

    total_unrealized_pnl = total_portfolio_value - total_invested_value
    
    # 6. Calculate Tax Liability
    total_tax_liability = 0.0
    
    if tax_rates.get("is_us_tax", True):
        # US Capital Gains Taxation Model
        # Short Term taxed at Ordinary Income Rate
        st_tax = max(0.0, total_st_realized) * tax_rates["st_rate"]
        # Long Term taxed at Long Term Capital Gain Rate
        lt_tax = max(0.0, total_lt_realized) * tax_rates["lt_rate"]
        total_tax_liability = st_tax + lt_tax
        
        # Net Investment Income Tax (NIIT) check:
        # Surcharge of 3.8% on net realized gains exceeding high-income threshold
        total_net_realized = max(0.0, total_st_realized + total_lt_realized)
        if total_net_realized > tax_rates["niit_threshold"]:
            taxable_niit_gains = total_net_realized - tax_rates["niit_threshold"]
            niit_tax = taxable_niit_gains * tax_rates["niit_rate"]
            total_tax_liability += niit_tax
    else:
        # Indian Capital Gains Taxation Model
        # Short Term capital gains (STCG) (default 20%)
        st_tax = max(0.0, total_st_realized) * tax_rates["st_rate"]
        # Long Term capital gains (LTCG) (default 12.5% above ₹1.25 Lakh)
        lt_gains = max(0.0, total_lt_realized)
        # Apply ₹1.25 Lakh (125,000) tax exemption threshold
        exemption = 125000.0
        taxable_lt_gains = max(0.0, lt_gains - exemption)
        lt_tax = taxable_lt_gains * tax_rates["lt_rate"]
        total_tax_liability = st_tax + lt_tax

    total_return = total_realized_pnl + total_unrealized_pnl + total_dividends
    total_return_percent = (total_return / total_invested_value * 100) if total_invested_value > 0 else 0.0

    summary = SummaryResponse(
        total_portfolio_value=total_portfolio_value,
        total_invested_value=total_invested_value,
        total_unrealized_pnl=total_unrealized_pnl,
        total_realized_pnl=total_realized_pnl,
        total_dividends=total_dividends,
        total_wash_sale_disallowed=total_wash_sale_disallowed,
        total_tax_liability=total_tax_liability,
        total_return=total_return,
        total_return_percent=total_return_percent
    )

    return {
        "holdings": holdings_list,
        "realized_matches": realized_matches,
        "summary": summary
    }
