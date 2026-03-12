"""
Admin Metrics Router — Aggregated LLM usage analytics for admin dashboard.
Protected by admin_required dependency.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, desc
from sqlalchemy.orm import Session

from app.auth import admin_required
from app.database import get_db
from app.models import LLMLog

router = APIRouter(tags=["admin-metrics"])


@router.get("/admin/metrics")
async def get_admin_metrics(
    db: Session = Depends(get_db),
    current_user: Any = Depends(admin_required),
):
    """
    Return aggregated LLM usage metrics for the admin dashboard.
    Only accessible to users with role == 'admin'.
    """
    # ── Total calls & success rate ──
    total_calls = db.query(func.count(LLMLog.id)).scalar() or 0
    success_count = (
        db.query(func.count(LLMLog.id))
        .filter(LLMLog.success == True)
        .scalar()
        or 0
    )
    success_rate = round((success_count / total_calls) * 100, 1) if total_calls > 0 else 0.0

    # ── Average latency ──
    avg_latency = (
        db.query(func.avg(LLMLog.latency_ms))
        .filter(LLMLog.latency_ms.isnot(None))
        .scalar()
    )
    avg_latency_ms = round(avg_latency) if avg_latency else 0

    # ── Total tokens ──
    total_input_tokens = (
        db.query(func.coalesce(func.sum(LLMLog.input_tokens), 0)).scalar()
    )
    total_output_tokens = (
        db.query(func.coalesce(func.sum(LLMLog.output_tokens), 0)).scalar()
    )

    # ── Time-series: last 30 days ──
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Calls over time
    calls_over_time_rows = (
        db.query(
            func.date(LLMLog.timestamp).label("date"),
            func.count(LLMLog.id).label("count"),
        )
        .filter(LLMLog.timestamp >= thirty_days_ago)
        .group_by(func.date(LLMLog.timestamp))
        .order_by(func.date(LLMLog.timestamp))
        .all()
    )
    calls_over_time = [
        {"date": str(row.date), "count": row.count} for row in calls_over_time_rows
    ]

    # Latency over time
    latency_over_time_rows = (
        db.query(
            func.date(LLMLog.timestamp).label("date"),
            func.avg(LLMLog.latency_ms).label("avg"),
        )
        .filter(LLMLog.timestamp >= thirty_days_ago, LLMLog.latency_ms.isnot(None))
        .group_by(func.date(LLMLog.timestamp))
        .order_by(func.date(LLMLog.timestamp))
        .all()
    )
    latency_over_time = [
        {"date": str(row.date), "avg": round(row.avg) if row.avg else 0}
        for row in latency_over_time_rows
    ]

    # Tokens over time
    tokens_over_time_rows = (
        db.query(
            func.date(LLMLog.timestamp).label("date"),
            func.coalesce(func.sum(LLMLog.input_tokens), 0).label("input"),
            func.coalesce(func.sum(LLMLog.output_tokens), 0).label("output"),
        )
        .filter(LLMLog.timestamp >= thirty_days_ago)
        .group_by(func.date(LLMLog.timestamp))
        .order_by(func.date(LLMLog.timestamp))
        .all()
    )
    tokens_over_time = [
        {"date": str(row.date), "input": int(row.input), "output": int(row.output)}
        for row in tokens_over_time_rows
    ]

    # ── Model distribution ──
    model_dist_rows = (
        db.query(
            LLMLog.model,
            func.count(LLMLog.id).label("count"),
        )
        .group_by(LLMLog.model)
        .order_by(desc("count"))
        .all()
    )
    model_distribution = [
        {"model": row.model, "count": row.count} for row in model_dist_rows
    ]

    # ── Top users ──
    top_users_rows = (
        db.query(
            LLMLog.user_id,
            func.count(LLMLog.id).label("calls"),
        )
        .filter(LLMLog.user_id.isnot(None))
        .group_by(LLMLog.user_id)
        .order_by(desc("calls"))
        .limit(10)
        .all()
    )
    top_users = [
        {"user_id": row.user_id, "calls": row.calls} for row in top_users_rows
    ]

    # ── Recent errors ──
    recent_errors_rows = (
        db.query(LLMLog)
        .filter(LLMLog.success == False)
        .order_by(LLMLog.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_errors = [
        {
            "created_at": row.timestamp.isoformat() if row.timestamp else None,
            "error_message": row.error_message,
            "model": row.model,
        }
        for row in recent_errors_rows
    ]

    # ── Raw logs (last 50) ──
    raw_logs_rows = (
        db.query(LLMLog)
        .order_by(LLMLog.timestamp.desc())
        .limit(50)
        .all()
    )
    raw_logs = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "model": row.model,
            "prompt_version": row.prompt_version,
            "input_tokens": row.input_tokens,
            "output_tokens": row.output_tokens,
            "latency_ms": row.latency_ms,
            "success": row.success,
            "created_at": row.timestamp.isoformat() if row.timestamp else None,
            "error_message": row.error_message,
            "run_id": row.run_id,
        }
        for row in raw_logs_rows
    ]

    return {
        "total_calls": total_calls,
        "success_rate": success_rate,
        "avg_latency_ms": avg_latency_ms,
        "total_input_tokens": int(total_input_tokens),
        "total_output_tokens": int(total_output_tokens),
        "calls_over_time": calls_over_time,
        "latency_over_time": latency_over_time,
        "tokens_over_time": tokens_over_time,
        "model_distribution": model_distribution,
        "top_users": top_users,
        "recent_errors": recent_errors,
        "raw_logs": raw_logs,
    }
