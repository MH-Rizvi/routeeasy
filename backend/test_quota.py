import asyncio
from app.services.geocoding_service import geocode
from app.database import SessionLocal, Base, engine
from app.models import ApiUsage
from datetime import datetime, timezone

async def test():
    # Make sure tables are created
    Base.metadata.create_all(bind=engine)
    
    # 1. Normal run (should be success = True or at least not quota blocked)
    print("Test 1: Normal call")
    res1 = await geocode("Target Hicksville NY", "Hicksville, NY")
    print("Result 1:", res1)
    
    # Check DB
    db = SessionLocal()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = db.query(ApiUsage).filter(ApiUsage.api_name == "google_geocoding", ApiUsage.date == today).first()
    print(f"Usage count: {usage.request_count if usage else 0}")
    
    # 2. Simulate 1300 calls
    if usage:
        usage.request_count = 1300
        db.commit()
    print("Test 2: Quota exceeded")
    res2 = await geocode("Walmart Westbury NY", "Westbury, NY")
    print("Result 2:", res2)
    
    # 3. Restore to 0 so the user isn't actually blocked on real usage
    if usage:
        usage.request_count = 0
        db.commit()
    db.close()

if __name__ == "__main__":
    asyncio.run(test())
