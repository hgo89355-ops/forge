"""Indicators. Every value at row t uses data up to and including bar t's close only."""
import numpy as np
import pandas as pd


def sma(s, n):
    return s.rolling(n, min_periods=n).mean()


def ema(s, n):
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def rsi(close, n=2):
    d = close.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    rs = up / dn.replace(0, np.nan)
    out = 100 - 100 / (1 + rs)
    return out.fillna(100.0).where(up.notna())


def atr(df, n=14):
    pc = df["close"].shift(1)
    tr = pd.concat([df["high"] - df["low"], (df["high"] - pc).abs(), (df["low"] - pc).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def ibs(df):
    rng = (df["high"] - df["low"]).replace(0, np.nan)
    return ((df["close"] - df["low"]) / rng).fillna(0.5)


def momentum_12_1(close):
    """12-month return skipping the most recent month (paper 3.1, T=12, S=1), on daily bars."""
    return close.shift(21) / close.shift(252) - 1


def realized_vol(close, n=63):
    return np.log(close).diff().rolling(n, min_periods=n).std() * np.sqrt(252)
