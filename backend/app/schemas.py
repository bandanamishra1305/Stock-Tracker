from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class TransactionBase(BaseModel):
    activity_date: datetime
    process_date: Optional[datetime] = None
    settle_date: Optional[datetime] = None
    instrument: str
    description: Optional[str] = None
    trans_code: str
    quantity: float
    price: float
    amount: float

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class HoldingResponse(BaseModel):
    ticker: str
    quantity: float
    average_buy_price: float
    current_price: float
    current_value: float
    invested_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float
    dividends: float

class MatchedBuyResponse(BaseModel):
    buy_date: datetime
    buy_price: float
    quantity: float
    realized_gain: float
    wash_sale_disallowed: float = 0.0

class RealizedMatchResponse(BaseModel):
    ticker: str
    sell_date: datetime
    sell_price: float
    quantity: float
    realized_pnl: float
    matched_buys: List[MatchedBuyResponse]
    wash_sale_disallowed: float = 0.0
    holding_period_days: int
    classification: str  # "Short-Term" or "Long-Term"

class SummaryResponse(BaseModel):
    total_portfolio_value: float
    total_invested_value: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    total_dividends: float
    total_wash_sale_disallowed: float
    total_tax_liability: float
    total_return: float
    total_return_percent: float

class PortfolioDataResponse(BaseModel):
    holdings: List[HoldingResponse]
    realized_matches: List[RealizedMatchResponse]
    summary: SummaryResponse
