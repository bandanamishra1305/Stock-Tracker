# StockTrack: Robinhood Portfolio & Tax Engine

StockTrack is a comprehensive full-stack web application designed to help retail investors accurately track their stock portfolios and estimate their capital gains tax liabilities. It parses brokerage transaction ledgers, handles stock split conversions, implements strict First-In-First-Out (FIFO) lot matching, and detects wash sale disallowed losses.

---

## 🏗️ Architecture & Tech Stack

*   **Frontend:** React + Next.js (TypeScript) styled with TailwindCSS and Recharts for data visualization.
*   **Backend:** Python + FastAPI for high-performance REST APIs.
*   **Database:** SQLite (local zero-setup development) / PostgreSQL (production via SQLAlchemy ORM).
*   **Authentication:** JWT with Time-based One-Time Password (TOTP) 2FA login.

---

## 🔐 Authentication & Setup (2FA)

1.  **Configure environment variables:**
    Copy `.env.example` in the root directory to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  **Verify credentials inside `.env`:**
    *   `ADMIN_USERNAME`: `admin` (or choose your username)
    *   `ADMIN_PASSWORD`: `password` (or choose your password)
    *   `TOTP_SECRET`: `JBSWY3DPEHPK3PXP` (or generate a base32 string using `python -c "import pyotp; print(pyotp.random_base32())"`)
3.  **Add to Authenticator App:**
    Add the `TOTP_SECRET` to your authenticator app (e.g. Google Authenticator, Authy) manually using the secret key, or use this QR code URI:
    `otpauth://totp/StockTrack?secret=JBSWY3DPEHPK3PXP&issuer=StockTrack`

---

## 🚀 Getting Started

You can run StockTrack locally using either Docker Compose or by starting the services individually on Windows.

### Option A: Running with Docker Compose (Recommended)
This runs the Next.js app, FastAPI app, and a PostgreSQL database inside containers automatically:
```bash
docker compose up --build
```
*   **Frontend:** `http://localhost:3000`
*   **Backend API:** `http://localhost:8000`

---

### Option B: Running Natively on Windows

#### 1. Start the FastAPI Backend
Open a command prompt or terminal in the `backend` folder:
```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
The server will start on `http://localhost:8000` and automatically create a local SQLite database file `stocktrack.db` in the backend folder.

#### 2. Start the Next.js Frontend
Open a separate command prompt or terminal in the `frontend` folder:
```cmd
cd frontend
npm install
npm run dev
```
The server will start on `http://localhost:3000`. Navigate there in your browser to log in using your credentials and 6-digit TOTP code.

---

## 📊 Sample Data Testing

To demonstrate the capabilities of the portfolio engine:
1.  Log in to the dashboard portal.
2.  Drag and drop the file `data/sample-data.csv` (located in the project root) into the upload zone.
3.  Inspect:
    *   **Active Holdings:** Live quotes fetched from Yahoo Finance.
    *   **FIFO Matches & Wash Sales:** Expandable rows showing exact buy lot matching dates and disallowed loss roll forwards.
    *   **Charts:** Interactive doughnut allocations and realized/unrealized P&L bars.
    *   **Tax Config Settings:** Toggle between US and Indian tax relief thresholds.
