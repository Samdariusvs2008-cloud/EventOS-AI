
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient
import main


def run_tests():
    with tempfile.TemporaryDirectory() as folder:
        # Use a separate temporary database so your real data stays safe.
        main.DATABASE = str(Path(folder) / "test.db")
        main.setup_database()

        client = TestClient(main.app)
        passed = 0
        total = 0

        def check(description, condition):
            nonlocal passed, total
            total += 1
            if condition:
                passed += 1
                print(f"PASS: {description}")
            else:
                print(f"FAIL: {description}")

        # 1. API is running
        check("Home endpoint", client.get("/").status_code == 200)

        # 2. Register a student
        student = {
            "name": "Alex Smith",
            "email": "alex@example.com",
            "college_department": "Computer Science",
        }
        response = client.post("/register", json=student)
        check("Register student", response.status_code == 201)
        student_id = response.json().get("id") if response.status_code == 201 else None

        # 3. Reject duplicate email
        check(
            "Reject duplicate email",
            client.post("/register", json=student).status_code == 409,
        )

        # 4. List registrations
        response = client.get("/registrations")
        check(
            "List registrations",
            response.status_code == 200
            and response.json()["total"] == 1,
        )

        # 5. Find registration by ID
        response = client.get(f"/registrations/{student_id}")
        check(
            "Find registration by ID",
            response.status_code == 200
            and response.json()["email"] == "alex@example.com",
        )

        # 6. Find registration by email
        response = client.get(
            "/registrations/search/by-email",
            params={"email": "alex@example.com"},
        )
        check(
            "Find registration by email",
            response.status_code == 200
            and response.json()["id"] == student_id,
        )

        # 7. Reject an unknown registration ID
        check(
            "Unknown ID returns 404",
            client.get("/registrations/9999").status_code == 404,
        )

        # 8. Reject invalid email
        invalid = client.post(
            "/register",
            json={"name": "Alex Smith", "email": "not-an-email"},
        )
        check("Reject invalid email", invalid.status_code == 422)

        # 9. Reject too-short name
        invalid = client.post(
            "/register",
            json={"name": "A", "email": "a@example.com"},
        )
        check("Reject invalid name", invalid.status_code == 422)

        # 10. Check available seats
        response = client.get("/events/1/availability")
        check(
            "Availability count",
            response.status_code == 200
            and response.json()["confirmed"] == 1
            and response.json()["available_seats"] == 49,
        )

        # 11. Fill remaining seats
        capacity_ok = True
        for i in range(2, 51):
            response = client.post(
                "/register",
                json={
                    "name": f"Student {i}",
                    "email": f"student{i}@example.com",
                },
            )
            if response.status_code != 201:
                capacity_ok = False
                break

        check("Register up to 50 students", capacity_ok)

        # 12. Reject the 51st student
        response = client.post(
            "/register",
            json={
                "name": "Student 51",
                "email": "student51@example.com",
            },
        )
        check("Reject registration when full", response.status_code == 409)

        print(f"\nRESULT: {passed}/{total} tests passed.")


if __name__ == "__main__":
    run_tests()
