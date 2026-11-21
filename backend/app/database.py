"""
Database session and Base re-export for backward compatibility and clean modular imports.
"""
from .core.database import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
