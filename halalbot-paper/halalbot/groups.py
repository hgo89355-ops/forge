SECTOR = {}
def _add(names, sec):
    for n in names.split(): SECTOR[n] = sec
_add("AAPL MSFT ADBE CRM ORCL IBM CSCO SNPS CDNS INTU NOW", "Tech: software & hardware")
_add("NVDA AVGO AMD INTC QCOM TXN ADI AMAT LRCX KLAC MU", "Tech: semiconductors")
_add("GOOGL GOOG META NFLX DIS T VZ", "Communication")
_add("AMZN TSLA HD LOW MCD SBUX NKE UBER GM F", "Consumer discretionary")
_add("COST WMT PG PEP KO", "Consumer staples")
_add("BRK-B JPM BAC WFC C GS MS BLK", "Financials: banks & asset managers")
_add("V MA PYPL", "Financials: payments")
_add("LLY UNH JNJ MRK ABBV PFE BMY ABT MDT TMO DHR ISRG", "Healthcare")
_add("XOM CVX COP EOG SLB", "Energy")
_add("BA CAT DE HON GE UPS FDX LIN", "Industrials & materials")
_add("SPY QQQ IWM DIA EFA EEM", "Index funds")
_add("XLK XLF XLE XLV XLY XLP XLI XLU XLB XLC XLRE", "Sector funds")
_add("TLT IEF", "Bond funds")
_add("GLD GC=F", "Gold")
_add("NQ=F ES=F", "Index futures")
_add("BTC-USD ETH-USD SOL-USD BNB-USD XRP-USD ADA-USD AVAX-USD LINK-USD BTC ETH SOL BNB XRP ADA AVAX LINK HYPE ZEC NEAR WLD XMR ENA SUI UNI ZRO AAVE STRK TAO ARB ONDO AERO CRV LTC TIA DOT INJ", "Crypto")
_add("EURUSD=X GBPUSD=X USDJPY=X AUDUSD=X", "Forex")
def sector(sym):
    s = sym.replace("xyz_", "")
    return SECTOR.get(s, "Other")
def asset_class(sym):
    sec = sector(sym)
    if sec in ("Index funds", "Sector funds", "Bond funds"): return "Funds"
    if sec in ("Crypto", "Forex", "Gold", "Index futures"): return sec
    return "Single stocks"
