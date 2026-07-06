from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    activity_date = Column(DateTime, nullable=False)
    process_date = Column(DateTime, nullable=True)
    settle_date = Column(DateTime, nullable=True)
    instrument = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    trans_code = Column(String, nullable=False)  # 'Buy', 'Sell', 'CDIV'
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
