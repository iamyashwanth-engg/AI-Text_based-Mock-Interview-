# AI Technical Mock Interviewer (Text-Based)

A text-driven AI mock interview platform for Software Engineering (SWE) roles. Built with a Next.js frontend and a Python (FastAPI) backend, it conducts single-turn technical interviews across four rounds, dynamically scales question difficulty, and generates structured evaluation scorecards with actionable feedback.

---

## Features

- **4 Core Interview Rounds**:
  - **Round 1: Online Assessment (OA) / DSA**: Verbal problem solving, algorithmic walk-throughs, edge cases, and time/space complexity analysis.
  - **Round 2: Core CSE Fundamentals**: Adaptive difficulty (Easy -> Medium -> Hard) covering OS, DBMS, Computer Networks, and OOP concepts.
  - **Round 3: Resume Grinding & Machine Coding / LLD**: Deep architectural drill-downs, API contracts, schema modeling, and trade-offs.
  - **Round 4: Behavioral & HR**: Evaluation using the STAR framework (Situation, Task, Action, Result).
- **Structured Performance Scorecards**: Post-interview evaluation returning numeric metrics (1–10), hiring verdicts, identified strengths, knowledge gaps, and study recommendations.
- **Backend Security & Guardrails**:
  - Server-side API key isolation (Google AI Studio keys never reach client).
  - Endpoint rate-limiting with `slowapi` to prevent token abuse.
  - Strict CORS origin whitelisting.
- **100% Free Tier Stack**: Uses Gemini 2.5 Flash via Google AI Studio's free tier with zero recurring subscription or infrastructure costs.

---

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Backend**: Python 3.11+, FastAPI, Uvicorn
- **AI Engine**: Google GenAI SDK (`google-genai`), Gemini 2.5 Flash (`response_schema` structured JSON)
- **Validation & Security**: Pydantic v2, SlowAPI

---

## Project Structure

```text
ai-interview/
├── backend/
│   ├── main.py             # FastAPI endpoints (chat turn + evaluation)
│   ├── prompts.py          # SWE round system instructions & adaptive logic
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Secret API keys & environment variables
└── frontend/
    ├── app/                # Next.js App Router (UI & layout)
    ├── components/         # Chat interface & Scorecard modal
    ├── package.json        # Frontend dependencies
    └── .env.local          # Frontend API endpoint config
