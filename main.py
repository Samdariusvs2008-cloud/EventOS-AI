
from datetime import datetime, timezone
import sqlite3
import httpx
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="EventOS AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
CAPACITY = 50
DATABASE = "eventos.db"


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def setup_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                college_department TEXT,
                registered_at TEXT NOT NULL
            )
        """)


setup_database()


class Student(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    college_department: str | None = None


@app.get("/")
def home():
    return {"message": "Welcome to EventOS AI"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/register", status_code=201)
def register(student: Student):
    email = str(student.email).lower()

    with get_connection() as connection:
        try:
            count = connection.execute(
                "SELECT COUNT(*) FROM registrations"
            ).fetchone()[0]

            if count >= CAPACITY:
                raise HTTPException(
                    status_code=409,
                    detail="Event is full"
                )

            cursor = connection.execute(
                """
                INSERT INTO registrations
                (name, email, college_department, registered_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    student.name.strip(),
                    email,
                    student.college_department,
                    datetime.now(timezone.utc).isoformat()
                )
            )

            registration = connection.execute(
                "SELECT * FROM registrations WHERE id = ?",
                (cursor.lastrowid,)
            ).fetchone()

            return dict(registration)

        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="This email is already registered"
            )


@app.get("/registrations")
def get_registrations():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM registrations ORDER BY id"
        ).fetchall()

        return {
            "total": len(rows),
            "items": [dict(row) for row in rows]
        }


@app.get("/registrations/{registration_id}")
def get_registration(registration_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM registrations WHERE id = ?",
            (registration_id,)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Registration not found"
            )

        return dict(row)


@app.get("/registrations/search/by-email")
def get_registration_by_email(email: EmailStr = Query(...)):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM registrations WHERE email = ?",
            (str(email).lower(),)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Registration not found"
            )

        return dict(row)


@app.get("/events/1/availability")
def availability():
    with get_connection() as connection:
        confirmed = connection.execute(
            "SELECT COUNT(*) FROM registrations"
        ).fetchone()[0]

    return {
        "capacity": CAPACITY,
        "confirmed": confirmed,
        "available_seats": CAPACITY - confirmed,
        "is_full": confirmed >= CAPACITY
    }

@app.get("/ai/insights")
async def ai_insights():
    # Get real data from SQLite
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT college_department, registered_at
            FROM registrations
            ORDER BY id
            """
        ).fetchall()

    total = len(rows)
    departments = {}

    for row in rows:
        department = (
            row["college_department"] or "Not specified"
        ).strip()
        departments[department] = departments.get(department, 0) + 1

    facts = {
        "capacity": CAPACITY,
        "confirmed_registrations": total,
        "available_seats": max(CAPACITY - total, 0),
        "is_full": total >= CAPACITY,
        "registrations_by_department": departments,
        "registration_dates": [
            row["registered_at"][:10] for row in rows
        ],
    }

    prompt = f"""
    Analyse this actual EventOS database summary:
    {facts}

    Provide:
    1. Three useful observations supported by the data.
    2. Practical recommendations for the organiser.
    3. Limitations and missing information.

    Rules:
    - Never invent numbers or claim unsupported trends.
    - Distinguish measured facts from interpretations.
    - If there is insufficient data, say so explicitly.
    - Label recommendations as suggestions, not facts.
    """

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "gemma4:e4b",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are EventOS AI. "
                                "Use only the supplied facts."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            response.raise_for_status()
            result = response.json()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable. Start Ollama and retry.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Gemma timed out. Please try again.",
        )
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Gemma returned an error. Check Ollama and the model name.",
        )

    return {
        "model": "gemma4:e4b",
        "measured_facts": facts,
        "analysis": result["message"]["content"],
    }
