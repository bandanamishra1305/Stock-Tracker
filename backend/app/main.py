from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import asyncio

from app.config import settings
from app.database import engine, Base, get_db
from app.models import Transaction
from app.schemas import TokenResponse, LoginRequest, PortfolioDataResponse, TransactionResponse
from app.auth import get_current_user, verify_password, get_password_hash, create_access_token, verify_totp
from app.parser import parse_csv_data
from app.finance import get_live_prices, get_split_histories
from app.engine import calculate_portfolio

# Build Database Tables on Startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockTrack API", version="1.0.0")

# Enable CORS for Next.js (usually port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down to authorized domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    # Verify Username
    if credentials.username != settings.ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, password, or 2FA code",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verify Password
    # Support both plain text comparison for initial config and hashed comparison
    # We check settings.ADMIN_PASSWORD directly (if they set it in plain text in env)
    # or verify against hash if it starts with standard bcrypt prefix.
    is_valid_pw = False
    if settings.ADMIN_PASSWORD.startswith("$2b$") or settings.ADMIN_PASSWORD.startswith("$2a$"):
        is_valid_pw = verify_password(credentials.password, settings.ADMIN_PASSWORD)
    else:
        is_valid_pw = (credentials.password == settings.ADMIN_PASSWORD)
        
    if not is_valid_pw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, password, or 2FA code",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify 2FA TOTP Code
    # The user provides the 6 digit verification code from their app
    if not verify_totp(credentials.totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, password, or 2FA code",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Sign JWT Token
    access_token = create_access_token(data={"sub": credentials.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/verify")
async def verify_auth_status(username: str = Depends(get_current_user)):
    """Verifies if the current JWT token is active and valid."""
    return {"valid": True, "username": username}

@app.post("/api/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    try:
        # Read file contents
        content_bytes = await file.read()
        content = content_bytes.decode('utf-8')
        
        # Parse CSV
        parsed_txs = parse_csv_data(content)
        if not parsed_txs:
            raise HTTPException(status_code=400, detail="No valid transactions found in the CSV.")

        # Clear existing transactions and insert new ones atomically
        db.query(Transaction).delete()
        
        db_objs = [
            Transaction(
                activity_date=tx["activity_date"],
                process_date=tx["process_date"],
                settle_date=tx["settle_date"],
                instrument=tx["instrument"],
                description=tx["description"],
                trans_code=tx["trans_code"],
                quantity=tx["quantity"],
                price=tx["price"],
                amount=tx["amount"]
            )
            for tx in parsed_txs
        ]
        
        db.bulk_save_objects(db_objs)
        db.commit()
        
        print(f"[Upload] Successfully ingested {len(db_objs)} transactions by user {username}.")
        return {"message": "File processed successfully.", "count": len(db_objs)}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[Upload Error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@app.get("/api/portfolio", response_model=PortfolioDataResponse)
async def get_portfolio_metrics(
    is_us_tax: bool = Query(True, description="Whether to use US capital gains taxation"),
    st_rate: float = Query(0.24, description="Short-term tax rate"),
    lt_rate: float = Query(0.15, description="Long-term tax rate"),
    niit_threshold: float = Query(200000.0, description="NIIT income threshold"),
    niit_rate: float = Query(0.038, description="NIIT rate"),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user)
):
    # Fetch all transactions from Database
    transactions = db.query(Transaction).order_by(Transaction.activity_date.asc()).all()
    
    if not transactions:
        # Return empty portfolio structure
        return {
            "holdings": [],
            "realized_matches": [],
            "summary": {
                "total_portfolio_value": 0.0,
                "total_invested_value": 0.0,
                "total_unrealized_pnl": 0.0,
                "total_realized_pnl": 0.0,
                "total_dividends": 0.0,
                "total_wash_sale_disallowed": 0.0,
                "total_tax_liability": 0.0,
                "total_return": 0.0,
                "total_return_percent": 0.0
            }
        }

    # Identify unique ticker instruments
    tickers = list(set([tx.instrument for tx in transactions]))
    
    # Query live prices and split histories from Yahoo Finance in parallel
    print(f"[Portfolio] Fetching market details for: {', '.join(tickers)}")
    live_prices_task = get_live_prices(tickers)
    splits_task = get_split_histories(tickers)
    
    live_prices, splits_dict = await asyncio.gather(live_prices_task, splits_task)

    # Setup tax settings dictionary
    tax_rates = {
        "is_us_tax": is_us_tax,
        "st_rate": st_rate,
        "lt_rate": lt_rate,
        "niit_threshold": niit_threshold,
        "niit_rate": niit_rate
    }

    # Run FIFO accounting & tax calculator
    print("[Portfolio] Running calculations engine...")
    portfolio_data = calculate_portfolio(transactions, live_prices, splits_dict, tax_rates)
    
    return portfolio_data

@app.get("/api/transactions", response_model=List[TransactionResponse])
async def get_raw_transactions_list(
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user)
):
    # Query transactions ordered by activity date descending (newest first)
    transactions = db.query(Transaction).order_by(Transaction.activity_date.desc()).all()
    return transactions
