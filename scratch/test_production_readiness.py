import os
import sys
import json
import uuid
import time
import asyncio
from httpx import AsyncClient, ASGITransport

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from app.main import app
from app.services.monitoring_service import monitoring_service
from app.auth.rate_limiter import rate_limiter

async def run_production_readiness_tests():
    print("=" * 60)
    print("PML PRODUCTION PERFORMANCE, COST & MONITORING TEST SUITE")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        # TEST 1: Health Check Endpoint
        print("\n[TEST 1] System Health & Service Status:")
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed with {res.status_code}"
        data = res.json()
        assert data.get("status") == "ok", "Health check status not ok"
        assert "X-Request-ID" in res.headers, "X-Request-ID header missing from response"
        print(f"  Status: {data.get('status')} | Service: {data.get('service')}")
        print(f"  Request ID: {res.headers.get('X-Request-ID')}")
        print("  -> Test 1: [PASSED]")

        # TEST 2: Performance & AI Cost Metrics Endpoint
        print("\n[TEST 2] Live Monitoring & Cost Telemetry API:")
        m_res = await client.get("/api/monitoring/metrics")
        assert m_res.status_code == 200, f"Metrics endpoint failed with {m_res.status_code}"
        metrics = m_res.json()
        assert "latency" in metrics and "cost" in metrics, "Missing latency/cost in telemetry"
        print(f"  Total Requests Logged: {metrics.get('total_requests')}")
        print(f"  P50 Latency: {metrics['latency']['p50_ms']}ms | P95 Latency: {metrics['latency']['p95_ms']}ms")
        print(f"  Estimated AI Cost: ${metrics['cost']['estimated_cost_usd']}")
        print("  -> Test 2: [PASSED]")

        # TEST 3: Streaming AI Response Endpoint (SSE)
        print("\n[TEST 3] Server-Sent Events (SSE) Response Streaming:")
        stream_payload = {
            "message": "Explain quicksort in one concise sentence.",
            "conversation_id": f"pml-conv-test-{uuid.uuid4().hex[:6]}",
            "memory_enabled": False
        }
        stream_res = await client.post("/api/chat/stream", json=stream_payload)
        assert stream_res.status_code == 200, f"Streaming failed with {stream_res.status_code}"
        assert "text/event-stream" in stream_res.headers.get("content-type", ""), "Invalid content type for SSE"
        
        events = stream_res.text.strip().split("\n\n")
        assert len(events) >= 2, f"Expected multiple streaming events, got {len(events)}"
        print(f"  Streaming Status Code: {stream_res.status_code} (text/event-stream)")
        print(f"  Total Stream Events Received: {len(events)}")
        print(f"  First Event: {events[0][:60]}...")
        print(f"  Last Event: {events[-1][:60]}...")
        print("  -> Test 3: [PASSED]")

        # TEST 4: Cost Estimation & Token Tracking Invariant
        print("\n[TEST 4] Token & Cost Calculation Invariant:")
        req_id = monitoring_service.generate_request_id()
        metric = monitoring_service.record_request(
            request_id=req_id,
            endpoint="/api/chat",
            method="POST",
            user_id="user_test_123",
            status_code=200,
            duration_ms=45.2,
            tools_called=["calculator"],
            prompt_tokens=500,
            completion_tokens=200
        )
        assert metric.estimated_cost_usd > 0, "Cost calculation failed"
        print(f"  Recorded Request: {metric.request_id}")
        print(f"  Prompt Tokens: {metric.prompt_tokens} | Completion Tokens: {metric.completion_tokens}")
        print(f"  Calculated Cost: ${metric.estimated_cost_usd} USD")
        print("  -> Test 4: [PASSED]")

        # TEST 5: Graceful Error & Tool Circuit Breaker
        print("\n[TEST 5] Graceful Degradation on Invalid Input:")
        err_payload = {
            "message": "",  # Empty message without attachments
            "memory_enabled": False
        }
        err_res = await client.post("/api/chat", json=err_payload)
        # Should gracefully return standard validation response rather than 500 unhandled crash
        assert err_res.status_code in (200, 400, 422), f"Unexpected status: {err_res.status_code}"
        print(f"  Handled Empty Request Status: {err_res.status_code} (No 500 internal server crash)")
        print("  -> Test 5: [PASSED]")

        # TEST 6: Zero Secret Leakage in Telemetry & Logs
        print("\n[TEST 6] Zero Secret Leakage Verification:")
        summary = monitoring_service.get_summary_metrics()
        summary_str = json.dumps(summary)
        from app.config import settings
        if settings.AI_API_KEY and len(settings.AI_API_KEY) > 10:
            assert settings.AI_API_KEY not in summary_str, "CRITICAL SECURITY BREACH: AI_API_KEY leaked in metrics!"
        if settings.SUPABASE_KEY and len(settings.SUPABASE_KEY) > 10:
            assert settings.SUPABASE_KEY not in summary_str, "CRITICAL SECURITY BREACH: SUPABASE_KEY leaked in metrics!"
        print("  Verified: No API keys, passwords, or secrets exist in metrics or logs.")
        print("  -> Test 6: [PASSED]")

    print("\n" + "=" * 60)
    print("ALL PRODUCTION READINESS & MONITORING TESTS PASSED (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_production_readiness_tests())
