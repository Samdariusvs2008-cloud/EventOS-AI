
import httpx

response = httpx.post(
    "http://localhost:11434/api/chat",
    json={
        "model": "gemma4:e4b",
        "messages": [
            {
                "role": "user",
                "content": (
                    "You are the AI analyst for EventOS. "
                    "Explain one way to analyse workshop registrations. "
                    "Do not invent statistics."
                ),
            }
        ],
        "stream": False,
    },
    timeout=180.0,
)

response.raise_for_status()
data = response.json()

print("\n--- GEMMA RESPONSE ---\n")
print(data["message"]["content"])
