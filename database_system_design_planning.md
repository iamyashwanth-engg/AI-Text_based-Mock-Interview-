# Planning: Database & System Design Architecture

This planning document details the visual architecture diagram of the AI Voice Mock Interviewer Web Application, the selected database solution (SQLite), and a comprehensive analysis of the tech stack's advantages and trade-offs.

---

## 1. System Design Architecture Diagram

Below is the visual system design diagram mapping the full-duplex audio stream and data flows across the system components, including the SQLite database integration.

![System Design Architecture](file:///C:/Users/aruna/.gemini/antigravity-ide/brain/398950e9-763d-43fe-870c-f4afcd39e127/system_design_architecture_1787151952124.jpg)

---

## 2. Selected Database: SQLite

To align with the **100% free-tier, zero-cost, and production-ready** requirements of the platform, we choose **SQLite** as the primary datastore for transcripts and scorecards. 

### Why SQLite?
1. **Self-Contained & Serverless**: SQLite requires zero server installation, configuration, or ongoing daemon maintenance. The database is a single flat file (`interviews.db`) stored directly in the backend folder.
2. **Native Python Support**: Python's standard library includes `sqlite3` natively. This guarantees compatibility out-of-the-box with zero build compile steps, preventing version conflicts on Windows.
3. **JSON Query Capabilities**: SQLite features native JSON functions (e.g., `json_extract()`), allowing the backend to write standard SQL queries against Pydantic-generated JSON scorecard structures directly inside columns.

---

## 3. Advantages on this Project

| Tech Component | Key Advantage | Impact on Mock Interviewer App |
| :--- | :--- | :--- |
| **FastAPI & Asyncio** | High-performance asynchronous non-blocking loops | Relays high-frequency audio chunks with microsecond overhead, preserving audio clarity. |
| **Gemini Live API** | Native Multimodal Audio in / Audio out | Reduces barge-in response latency from 3-5 seconds (traditional pipelines) to <1 second. |
| **SQLite File DB** | Zero-configuration local database file | Simplifies deployment. Users can test the app locally without installing Docker, postgresql, or configuring MongoDB clusters. |
| **AudioWorklet Thread** | Isolated web audio thread execution | Offloads PCM conversions from the browser main thread, preventing UI freezing during heavy CSS animations. |

---

## 4. Trade-Offs & Mitigation Strategies

### A. SQLite Concurrency (File-Level Locking)
*   **Trade-Off**: SQLite locks the database file during write transactions. If multiple candidates end their mock interviews and request scorecard saves at the exact same millisecond, write transactions will queue and potentially block.
*   **Mitigation**: For a local interview practice sandbox, this is a non-issue. For production scale-out, we can set SQLite in **WAL (Write-Ahead Logging)** mode to allow concurrent readers while a write transaction is active, or seamlessly swap the SQLAlchemy database URI string to a PostgreSQL instance (e.g., Neon or Supabase free tiers) with zero code modifications.

### B. SQLite Network Limitations
*   **Trade-Off**: SQLite is serverless, meaning it runs in-process. You cannot connect to a remote SQLite database over TCP/IP. The database file must reside on the same filesystem/VM as the FastAPI server.
*   **Mitigation**: Scale the FastAPI server vertically, or migrate to a cloud-hosted relational DB (PostgreSQL) when deploying horizontally across multiple server nodes/containers.

### C. Live API Experimental Limits
*   **Trade-Off**: The `gemini-2.0-flash-exp` model runs under AI Studio developer rate quotas, which may trigger 429 rate limit exceptions under prolonged continuous streaming.
*   **Mitigation**: We implement client-side error handling that intercepts connection drops, notifying the candidate if quotas are temporarily exhausted, and saving the transcript locally in the browser's `localStorage` to prevent data loss.

---

## 5. Next Steps (Pending Approval)
> [!IMPORTANT]
> **Execution Hold**: As requested, we have halted all server execution and file migrations. We are waiting for your approval to proceed to the database integration phase.
