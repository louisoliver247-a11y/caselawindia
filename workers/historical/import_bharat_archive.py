"""Resumable metadata import from the CC-BY-4.0 Bharat Courts AWS archive."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from dataclasses import asdict
from datetime import date, datetime, timezone

import psycopg
from psycopg.types.json import Jsonb
from bharat_courts import ArchiveClient
from bharat_courts.courts import HIGH_COURTS

CONNECTOR_VERSION = "bharat-courts/0.4.0"
DEFAULT_COURTS = ["sci", *sorted({court.code for court in HIGH_COURTS})]

UPSERT = """
INSERT INTO archive_judgments (
 source_key, cnr, case_id, title, court_code, court_name, bench, judges,
 author_judge, decision_date, registration_date, year, petitioner, respondent,
 citation, disposal_nature, description, pdf_path, pdf_exists,
 available_languages, connector_version, raw_metadata, last_verified_at
) VALUES (
 %(source_key)s, %(cnr)s, %(case_id)s, %(title)s, %(court_code)s,
 %(court_name)s, %(bench)s, %(judges)s, %(author_judge)s, %(decision_date)s,
 %(registration_date)s, %(year)s, %(petitioner)s, %(respondent)s, %(citation)s,
 %(disposal_nature)s, %(description)s, %(pdf_path)s, %(pdf_exists)s,
 %(available_languages)s, %(connector_version)s, %(raw_metadata)s, now()
) ON CONFLICT (source_key) DO UPDATE SET
 title = EXCLUDED.title, court_name = EXCLUDED.court_name, bench = EXCLUDED.bench,
 judges = EXCLUDED.judges, decision_date = EXCLUDED.decision_date,
 description = EXCLUDED.description, pdf_path = EXCLUDED.pdf_path,
 pdf_exists = EXCLUDED.pdf_exists, raw_metadata = EXCLUDED.raw_metadata,
 connector_version = EXCLUDED.connector_version, last_verified_at = now(),
 updated_at = now()
"""

def json_default(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "code"):
        return value.code
    return str(value)

def row_for(judgment, court_code: str, year: int) -> dict:
    raw = asdict(judgment)
    stable = judgment.cnr or judgment.case_id
    if not stable:
        identity = "|".join([court_code, str(year), judgment.title or "", str(judgment.decision_date or ""), judgment.pdf_path or ""])
        stable = hashlib.sha256(identity.encode()).hexdigest()
    court_name = judgment.court.name if judgment.court else judgment.court_name_raw or court_code
    return {
        "source_key": f"bharat:{stable}", "cnr": judgment.cnr,
        "case_id": judgment.case_id, "title": judgment.title or stable,
        "court_code": court_code, "court_name": court_name, "bench": judgment.bench,
        "judges": Jsonb(judgment.judges or []), "author_judge": judgment.author_judge,
        "decision_date": judgment.decision_date, "registration_date": judgment.date_of_registration,
        "year": judgment.year or year, "petitioner": judgment.petitioner,
        "respondent": judgment.respondent, "citation": judgment.citation,
        "disposal_nature": judgment.disposal_nature, "description": judgment.description,
        "pdf_path": judgment.pdf_path, "pdf_exists": judgment.pdf_exists,
        "available_languages": Jsonb(judgment.available_languages or []),
        "connector_version": CONNECTOR_VERSION,
        "raw_metadata": Jsonb(json.loads(json.dumps(raw, default=json_default))),
    }

def partition_done(conn, court: str, year: int) -> bool:
    row = conn.execute("SELECT status FROM archive_ingestion_partitions WHERE court_code=%s AND year=%s", (court, year)).fetchone()
    return bool(row and row[0] == "completed")

async def import_partition(client, conn, court: str, year: int, batch_size: int) -> int:
    conn.execute("""INSERT INTO archive_ingestion_partitions (court_code, year, status, started_at, error)
      VALUES (%s,%s,'running',now(),NULL) ON CONFLICT (court_code,year) DO UPDATE
      SET status='running', started_at=now(), error=NULL, updated_at=now()""", (court, year))
    conn.commit()
    count, batch = 0, []
    try:
        async for judgment in client.iter_judgments(court=court, year=year, batch_size=batch_size):
            batch.append(row_for(judgment, court, year))
            if len(batch) >= batch_size:
                with conn.cursor() as cursor:
                    cursor.executemany(UPSERT, batch)
                count += len(batch); batch.clear()
                conn.execute("UPDATE archive_ingestion_partitions SET imported_count=%s, updated_at=now() WHERE court_code=%s AND year=%s", (count, court, year))
                conn.commit()
        if batch:
            with conn.cursor() as cursor:
                cursor.executemany(UPSERT, batch)
            count += len(batch)
        conn.execute("UPDATE archive_ingestion_partitions SET status='completed', imported_count=%s, finished_at=now(), updated_at=now() WHERE court_code=%s AND year=%s", (count, court, year))
        conn.commit()
        print(json.dumps({"court": court, "year": year, "imported": count}), flush=True)
        return count
    except Exception as error:
        conn.rollback()
        conn.execute("UPDATE archive_ingestion_partitions SET status='failed', error=%s, updated_at=now() WHERE court_code=%s AND year=%s", (str(error)[:2000], court, year))
        conn.commit()
        raise

async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--court", action="append", choices=DEFAULT_COURTS)
    parser.add_argument("--year-from", type=int, default=1950)
    parser.add_argument("--year-to", type=int, default=datetime.now(timezone.utc).year)
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--retry-failed", action="store_true")
    args = parser.parse_args()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    courts = args.court or DEFAULT_COURTS
    with psycopg.connect(database_url) as conn:
        async with ArchiveClient() as client:
            for court in courts:
                for year in range(args.year_from, args.year_to + 1):
                    if partition_done(conn, court, year):
                        continue
                    await import_partition(client, conn, court, year, args.batch_size)

if __name__ == "__main__":
    asyncio.run(main())
