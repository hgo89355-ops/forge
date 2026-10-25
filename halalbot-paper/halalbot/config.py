"""
Universe and settings.

Allowed (per the owner's rules): stocks, ETFs, shorting, leverage within the risk limits, micro
index futures, and major cryptocurrencies. Excluded: meme coins and prediction markets.
"""

STOCKS = [  # S&P 100-style large caps: liquid, cheap to trade, easy to borrow for shorts
    "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "AVGO", "TSLA", "BRK-B", "LLY", "JPM",
    "V", "MA", "UNH", "XOM", "CVX", "JNJ", "PG", "HD", "LOW", "COST", "WMT", "MRK", "ABBV", "PEP",
    "KO", "BAC", "WFC", "C", "GS", "MS", "ADBE", "CRM", "AMD", "INTC", "CSCO", "ORCL", "IBM", "QCOM",
    "TXN", "ADI", "AMAT", "LRCX", "KLAC", "MU", "NFLX", "DIS", "MCD", "SBUX", "NKE", "BA", "CAT",
    "DE", "HON", "GE", "UPS", "FDX", "PFE", "BMY", "ABT", "MDT", "TMO", "DHR", "ISRG", "T", "VZ",
    "COP", "EOG", "SLB", "LIN", "SNPS", "CDNS", "INTU", "NOW", "PYPL", "UBER", "GM", "F", "BLK",
]

ETFS = ["SPY", "QQQ", "IWM", "DIA", "XLK", "XLF", "XLE", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB",
        "XLC", "XLRE", "GLD", "TLT", "IEF", "EFA", "EEM"]

FUTURES = ["NQ=F", "ES=F"]            # traded as MICRO contracts (MNQ, MES) - see portfolio.FUTURES
INDEX_PROXY = {"NQ=F": "QQQ", "ES=F": "SPY"}   # 5-min ETF bars used to model intraday futures trades

# Major coins only. Meme coins (DOGE, SHIB, PEPE, BONK, WIF, FLOKI, ...) are excluded on purpose.
CRYPTO = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD", "AVAX-USD", "LINK-USD"]

MARKET = "SPY"

PAIRS = [("V", "MA"), ("KO", "PEP"), ("XOM", "CVX"), ("AMAT", "LRCX"), ("KLAC", "LRCX"),
         ("ABT", "MDT"), ("CAT", "DE"), ("GOOGL", "GOOG"), ("FDX", "UPS"), ("HD", "LOW"),
         ("TXN", "ADI"), ("SNPS", "CDNS"), ("COP", "EOG"), ("JPM", "BAC"), ("GS", "MS"),
         ("WFC", "C"), ("T", "VZ"), ("PFE", "BMY"), ("MCD", "SBUX"), ("BTC-USD", "ETH-USD"),
         ("XLK", "QQQ"), ("SPY", "DIA")]

IN_SAMPLE_FRACTION = 0.6
