import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any

def parse_currency(val: str) -> float:
    if not val:
        return 0.0
    
    val_str = val.strip()
    is_negative = val_str.startswith('(') and val_str.endswith(')')
    
    # Remove characters: (, ), ₹, $, commas, and whitespace
    for char in ['(', ')', '₹', '$', ',', ' ']:
        val_str = val_str.replace(char, '')
        
    try:
        num = float(val_str)
        return -num if is_negative else num
    except ValueError:
        return 0.0

def parse_date(val: str) -> datetime:
    if not val:
        return datetime.now(timezone.utc)
    
    val_str = val.strip()
    # Try m/d/yyyy format
    try:
        parts = val_str.split('/')
        if len(parts) == 3:
            # Month, Day, Year
            m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
            return datetime(y, m, d, tzinfo=timezone.utc)
    except Exception:
        pass
        
    try:
        # Standard isoformat parsing
        return datetime.fromisoformat(val_str.replace('Z', '+00:00'))
    except ValueError:
        return datetime.now(timezone.utc)

def parse_csv_data(content: str) -> List[Dict[str, Any]]:
    parsed_transactions = []
    
    # Use StringIO to read string as a file object
    f = io.StringIO(content.strip())
    reader = csv.DictReader(f)
    
    # Clean headers by trimming whitespace
    headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
    
    # Re-read with cleaned fieldnames
    f.seek(0)
    reader = csv.DictReader(f, fieldnames=headers)
    next(reader)  # skip header row
    
    for row in reader:
        # Check that we have a valid row with instrument and transaction type
        instrument = row.get('Instrument', '').strip()
        trans_code = row.get('Trans Code', '').strip()
        
        # Standardize transaction codes: Sell, Buy, CDIV
        if trans_code.lower() == 'sell':
            std_trans_code = 'Sell'
        elif trans_code.lower() == 'buy':
            std_trans_code = 'Buy'
        elif trans_code.lower() in ['cdiv', 'dividend']:
            std_trans_code = 'CDIV'
        else:
            # Skip unrecognized codes (like subscriptions, cash deposits)
            continue
            
        if not instrument or not trans_code:
            continue
            
        qty = float(row.get('Quantity') or 0)
        price = parse_currency(row.get('Price', ''))
        amount = parse_currency(row.get('Amount', ''))
        
        parsed_transactions.append({
            "activity_date": parse_date(row.get('Activity Date', '')),
            "process_date": parse_date(row.get('Process Date', '')),
            "settle_date": parse_date(row.get('Settle Date', '')),
            "instrument": instrument,
            "description": row.get('Description', '').strip() if row.get('Description') else '',
            "trans_code": std_trans_code,
            "quantity": qty,
            "price": price,
            "amount": amount
        })
        
    # Sort chronologically before returning
    parsed_transactions.sort(key=lambda x: x["activity_date"])
    return parsed_transactions
