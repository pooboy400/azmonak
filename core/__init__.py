"""Azmoonak adaptive-learning algorithm core.

Pure algorithmic package: no I/O, no database, no external dependencies.
Every number the Azmoonak book shows is reproduced from these six engines.

Modules
-------
elo        Two-sided Elo rating (student ability / question difficulty).
placement  4-question cold-start placement (decision D1).
selector   Target-zone question selection + educational value (gap G8).
leveling   Category level ladder 1-3 with study alert (decision D16).
sm2        SM-2 spaced repetition with 3-signal quality (D10, D14).
predict    Elo-weighted session score (D13) + exponential forecast.
"""

__version__ = "0.1.0"

__all__ = ["elo", "placement", "selector", "leveling", "sm2", "predict"]
