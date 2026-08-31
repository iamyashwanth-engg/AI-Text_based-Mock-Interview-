# Project Progress Status: AI Voice Mock Interviewer Web App

This document tracks our current development state after the **Day 3: MySQL Database Integration** troubleshooting and setup.

---

## 1. Current File Status & Progress

| Phase / Day | Target Module | State | Status Description |
| :--- | :--- | :--- | :--- |
| **Day 1** | `backend/requirements.txt` & `.env` | **Completed** | Dependencies (`pymysql`, `fastapi`, etc.) installed. Environment credentials configured. |
| **Day 2** | `backend/prompts.py` | **Completed** | System prompts for all 4 tracks (`oa_dsa`, `core_cse`, `resume_lld`, `hr_behavioral`) and evaluation rubrics fully coded. |
| **Day 3** | `backend/db.py` | **Completed** | Database access layer created. Configured for MySQL with `pymysql` and WAL-like error logging. |
| **Day 4** | `backend/main.py` (Skeleton) | **Completed** | Basic FastAPI application setup. Dynamic `lifespan` hook calls `init_db()` on server startup, creating the `interviews` table automatically. |
| **Day 5** | `backend/main.py` (WS Proxy) | *Up Next* | Implement the bidirectional WebSocket proxy `/ws/interview/{round_type}` to secure connection to Gemini Live. |
| **Day 6** | `backend/main.py` (Evaluation) | *Pending* | Implement the rate-limited `/api/evaluate` scorecard generator route and `/api/session/{session_id}` reload route. |

---

## 2. Next Implementation Task: Day 5 - Bidirectional WebSocket Proxy

### Objective
Implement the WebSocket route `/ws/interview/{round_type}` in [`backend/main.py`](file:///c:/Users/aruna/AI-Interview/backend/main.py). 

This proxy intercepts browser connections, secures the API key on the backend, authenticates requests using a handshake token, injects the chosen round's prompts, and forwards duplex audio and text streams to the Google Gemini Live API over WebSockets.

### Execution Plan (What you need to code):

#### 1. Injects WebSocket Dependencies & Imports
Ensure the following packages are imported in [`backend/main.py`](file:///c:/Users/aruna/AI-Interview/backend/main.py):
```python
import base64
import websockets
from fastapi import WebSocket, WebSocketDisconnect
from backend.prompts import SYSTEM_PROMPTS
```

#### 2. Implement the Route handler: `ws_interview`
You will write a new WebSocket endpoint route that accepts two parameters:
*   `round_type` (path parameter)
*   `token` (query parameter)

```python
@app.websocket("/ws/interview/{round_type}")
async def ws_interview(websocket: WebSocket, round_type: str, token: str = None):
    # Logic goes here...
```

#### 3. Step-by-Step Code Walkthrough for the WebSocket Proxy logic:

*   **Step A: Handshake Token & Round Type Validation**:
    Check if the query parameter `token` matches `SECURE_HANDSHAKE_TOKEN` from your environment. Verify that the requested `round_type` exists in `SYSTEM_PROMPTS`. If either fails, close the websocket.
*   **Step B: Accept Connection**:
    Call `await websocket.accept()`.
*   **Step C: Connect to Gemini Multimodal Live API**:
    Retrieve the API key from environment variables. Connect to Google's live server endpoint using `websockets.connect()`:
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY`
*   **Step D: Send Initial Setup Config**:
    Send the setup message payload containing the model (`models/gemini-2.0-flash-exp`), the prebuilt voice selection (`Aoede`), and the system instruction string corresponding to `round_type`.
*   **Step E: Bi-directional Relay loops**:
    Run two async routines concurrently using `asyncio.gather()`:
    1.  **Client-to-Gemini Loop**: Wait for incoming messages from the client browser.
        *   If the message contains *binary bytes* (raw mic input), base64-encode them, wrap them in a `realtimeInput` JSON payload, and send them to the Gemini socket.
        *   If the message is *text* (control message or prompt updates), forward it directly.
    2.  **Gemini-to-Client Loop**: Read incoming text responses from Gemini (containing audio chunks, transcription events, or completion indicators) and relay them directly back to the client browser.

---

## 3. Ready to Begin?
Let me know if you would like me to show you the code template for these WebSocket handlers in [`backend/main.py`](file:///c:/Users/aruna/AI-Interview/backend/main.py), or if you have any questions on how the proxy routing handles binary audio chunks!
