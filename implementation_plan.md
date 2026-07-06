# StockTrack: Robinhood Portfolio & Tax Engine - Implementation Plan

This implementation plan details the architecture, calculations, and setup to build **StockTrack**, a full-stack production-grade web application to parse brokerage CSVs, run a FIFO + Wash Sale tax engine, fetch live market prices and splits, and estimate capital gains liabilities.

---

## User Review Required

> [!IMPORTANT]
> **WSL Compatibility & Portability**
> To avoid NTFS and execution permission conflicts in WSL when workspace folders are mounted from the Windows C: drive, the local development setup is designed to run **natively on Windows** (Node.js for Next.js, Python for FastAPI, SQLite/PostgreSQL) OR inside **Docker Desktop/Docker Compose** which handles mounts natively.
>
> **Indian vs. US Equities Support**
> The engine will dynamically support both **US Dollars ($) and Indian Rupees (₹)** based on the detected currency of the CSV, allowing you to track both Robinhood exports and Indian brokerage formats.
>
> **Authentication Setup (JWT + TOTP 2FA)**
> The application uses JWT for sessions and Time-based One-Time Password (TOTP) 2FA for security. You will define the login credentials and TOTP secret in your `.env` file. You can scan the TOTP QR code or input the base32 key in Google Authenticator/Authy to login.

---

## Proposed Changes

We will split the workspace into two primary modules: `backend` (FastAPI) and `frontend` (Next.js).

```
Stock-Tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py        # FastAPI server core & endpoints
│   │   ├── config.py      # App configurations & .env variables
│   │   ├── database.py    # Database connection & session setup
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic validation schemas
│   │   ├── auth.py        # JWT auth, password hash, & TOTP 2FA logic
│   │   ├── parser.py      # CSV ingestion & normalization (clean rupee/dollar)
│   │   ├── finance.py     # yfinance integrations for live prices & split histories
│   │   └── engine.py      # Core accounting engine (FIFO + Wash Sales + Splits + Holding Period + Taxes)
│   ├── requirements.txt   # Python dependency configuration
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # Next.js global layout
│   │   │   ├── page.tsx       # Main router (Dashboard or Login)
│   │   │   └── globals.css    # CSS file with dark-theme variables & Tailwind
│   │   ├── components/        # Reusable dashboard widgets, tables, & charts
│   │   │   ├── Login.tsx      # Secure 2FA Login Page
│   │   │   ├── Dashboard.tsx  # Interactive metrics & summary widget
│   │   │   ├── Holdings.tsx   # Active holdings with unrealized gains
│   │   │   ├── TaxReport.tsx  # Detailed FIFO Sell Matches & Wash Sales
│   │   │   ├── Ledger.tsx     # Raw transactions logs table
│   │   │   ├── Settings.tsx   # Configurable tax rates & currency selection
│   │   │   └── Charts.tsx     # Asset allocation & gain bars via Recharts
│   ├── package.json       # React, Tailwind, Next.js, Recharts, Lucide configuration
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml     # Standard Multi-container setup
├── render.yaml            # Render Blueprint for hosting in production
└── README.md              # Complete instructions for usage
```

---

### 1. Database Schema (`models.py`)

Using **SQLAlchemy**, we define the transaction database model:
*   `id`: Integer Primary Key
*   `activity_date`: Date
*   `process_date`: Date
*   `settle_date`: Date
*   `instrument`: String (e.g. `NVDA` or `RELIANCE`)
*   `description`: String
*   `trans_code`: String (`Buy`, `Sell`, or `CDIV`)
*   `quantity`: Float
*   `price`: Float
*   `amount`: Float

---

### 2. Core Accounting & Tax Engine (`engine.py`)

The Python engine processes raw transactions chronologically:

1.  **Stock Split Adjustments:**
    *   Query Yahoo Finance (`yfinance`) split histories for all unique tickers.
    *   Iterate through transactions. If a split event occurred at date `D` with ratio `R` (e.g., 10-for-1 ratio is 10), then for all transactions prior to date `D`:
        *   `quantity = quantity * R`
        *   `price = price / R`
2.  **FIFO Queue Engine:**
    *   Keep track of `buy_queue` for each symbol containing open buy lots.
    *   When a `Sell` occurs:
        *   Pop from the oldest available buy lot matching the quantity.
        *   Compute raw gain: `proceeds (qty * sell_price) - cost (qty * buy_price)`.
        *   Identify holding period: if `sell_date - buy_date <= 365 days`, mark as **Short-Term**; otherwise, **Long-Term**.
3.  **Wash Sale Disallowance (IRS Rule):**
    *   If raw gain is a loss (Realized Gain < 0):
        *   Look for a replacement purchase of the same ticker within a 61-day window around the sell transaction date (`[sell_date - 30 days, sell_date + 30 days]`).
        *   If a replacement buy is found:
            *   Disallow the loss (set realized taxable gain/loss for this transaction to 0).
            *   Add the disallowed loss amount to the cost basis of the replacement purchase lot in the queue.
            *   Adjust the holding period of the replacement lot.
4.  **Taxes & NIIT Calculation:**
    *   Tally net Short-Term capital gains (taxed at Ordinary Rate, default 24%).
    *   Tally net Long-Term capital gains (taxed at Long-Term Rate, default 15%).
    *   Compute Net Investment Income Tax (NIIT): If net realized capital gains exceed the high-income threshold (default $200k), apply a 3.8% surcharge.
    *   Support Indian taxation rules (STCG 20%, LTCG 12.5% above ₹1.25 Lakh) as a toggle.

---

### 3. JWT & TOTP 2FA Security (`auth.py`)

*   **Login Flow:** Frontend sends username, password, and the 6-digit TOTP code.
*   **TOTP Verification:** Backend verifies the TOTP code using `pyotp.TOTP(secret).verify(code)`.
*   **Token Issuance:** If password and TOTP are valid, signs a JWT containing the username, expiring in 24 hours.
*   **Authorization:** Middleware verifies the JWT in the header for all analytical endpoints.

---

### 4. Next.js Frontend Dashboard (`frontend`)

*   **Secure Auth Portal:** Responsive card interface prompting for credentials and authentication token.
*   **Real-time Analytics UI:**
    *   **Overview metrics cards** with animations.
    *   **Holdings list** with tickers, current values, average cost basis, and unrealized gains.
    *   **Tax reports widget** filtering FIFO realized matches by selected tax year (e.g. 2026) and listing wash-sale adjusted logs.
    *   **Charts page** using Recharts showing asset allocation and net realized gains per ticker.
    *   **Ledger** for sorting, searching, and inspecting raw transactions.
    *   **Config options panel** to customize tax rates, NIIT limits, and toggle currency themes ($ vs. ₹).

---

## Verification Plan

### Automated Verification
We will verify compiling and executing both servers:
1.  **Backend Tests:**
    *   Run FastAPI test queries utilizing pytest.
    *   Verify CSV parsing of `sample-data-india.csv` (includes brackets, rupee symbols, commas, and multiline cells).
2.  **Frontend Compilation:**
    *   Verify Next.js build compilation with no TypeScript or lint warnings: `npm run build`.

### Manual Verification
1.  Verify the Login flow using a simulated `.env` TOTP secret code using a python script.
2.  Upload `sample-data-india.csv` and inspect calculation totals, visual allocations, FIFO records, and wash-sale adjustments in the dashboard.
