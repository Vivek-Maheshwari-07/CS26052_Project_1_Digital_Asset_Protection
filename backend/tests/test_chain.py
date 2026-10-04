import pytest
from mongomock_motor import AsyncMongoMockClient
from app.registry.chain import append_to_chain, verify_chain

@pytest.fixture
def db():
    client = AsyncMongoMockClient()
    return client.digital_asset_test

@pytest.mark.asyncio
async def test_verify_chain_valid_and_corrupted(db):
    # 1. Insert 3 dummy records
    records_data = [
        {"owner_name": "Alice", "title": "Art 1", "phash": "hash1", "embedding": [0.1, 0.2]},
        {"owner_name": "Bob", "title": "Art 2", "phash": "hash2", "embedding": [0.3, 0.4]},
        {"owner_name": "Charlie", "title": "Art 3", "phash": "hash3", "embedding": [0.5, 0.6]}
    ]
    
    inserted_records = []
    for data in records_data:
        record = await append_to_chain(db, data)
        inserted_records.append(record)
        
    # 2. Verify chain is intact
    is_valid, broken_id = await verify_chain(db)
    assert is_valid is True
    assert broken_id is None
    
    # 3. Corrupt middle record directly in DB
    middle_record_id = inserted_records[1].id
    await db.works.update_one({"id": middle_record_id}, {"$set": {"title": "Corrupted Art 2"}})
    
    # 4. Verify chain fails and returns the broken record ID
    is_valid, broken_id = await verify_chain(db)
    assert is_valid is False
    assert broken_id == middle_record_id
