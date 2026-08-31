import os
import json
import base64
import asyncio
from typing import List
from contextlib import asynccontextmanager
import hashlib
import secrets

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, status, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
import websockets
# pyrefly: ignore [missing-import]
import httpx
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

# pyrefly: ignore [missing-import]
from slowapi import Limiter, _rate_limit_exceeded_handler
# pyrefly: ignore [missing-import]
from slowapi.util import get_remote_address
# pyrefly: ignore [missing-import]
from slowapi.errors import RateLimitExceeded

from backend.db import( init_db, save_interview_session, get_interview_session,
                        create_user, get_user_by_email, get_user_sessions)

from backend.prompts import SYSTEM_PROMPTS, EVALUATION_SYSTEM_PROMPT

# Retrieve environment secrets
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SECURE_HANDSHAKE_TOKEN = os.getenv("SECURE_HANDSHAKE_TOKEN", "super_secret_interview_token_123")

# Setup slowapi Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# The lifespan context manager handles code that runs when the server starts and stops.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: Initialize database tables
    print("Starting up FastAPI application...")
    try:
        init_db()
    except Exception as e:
        print(f"CRITICAL: Database initialization failed on startup: {e}")
    yield
    # Shutdown logic (runs when server stops)
    print("Shutting down FastAPI application...")

app = FastAPI(
    title="AI Voice Mock Interviewer API",
    description="Backend API for managing real-time voice sessions and scorecard evaluations.",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow the frontend (running on port 3000) to communicate with this backend (on port 8000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all HTTP headers
)

# Pydantic Schemas for Evaluation
class TranscriptItem(BaseModel):
    role: str = Field(..., description="Role: 'candidate' or 'interviewer'")
    text: str = Field(..., description="Text content of the turn")

class ScorecardInput(BaseModel):
    session_id: str = Field(..., description="Unique UUID for this session")
    round_type: str = Field(..., description="The interview round type")
    transcript: List[TranscriptItem] = Field(..., description="Full history of the interview")
    user_id: int = Field(None, description="Optional associated User ID") # Added

class MetricScores(BaseModel):
    technical_depth: int = Field(..., ge=1, le=10, description="Knowledge and explanations (1-10)")
    problem_solving: int = Field(..., ge=1, le=10, description="Handling complexity & edge cases (1-10)")
    communication: int = Field(..., ge=1, le=10, description="Clarity & articulation (1-10)")
    system_design: int = Field(..., ge=1, le=10, description="Low-level design & architecture principles (1-10)")

class TopicBreakdownItem(BaseModel):
    subtopic: str = Field(..., description="CS or engineering subtopic discussed")
    proficiency_level: str = Field(..., description="Proficiency rating: Beginner, Intermediate, or Advanced")
    observation: str = Field(..., description="Detailed observation or evidence from candidate's answers")

class ScorecardOutput(BaseModel):
    overall_score: int = Field(..., ge=0, le=100, description="Overall average performance score percentage")
    hiring_verdict: str = Field(..., description="Hiring decision: Strong Hire, Hire, Lean Hire, or No Hire")
    metrics: MetricScores
    strengths: List[str] = Field(..., description="Observed strengths during the interview")
    gaps_and_weaknesses: List[str] = Field(..., description="Identified areas of improvement or conceptual gaps")
    actionable_suggestions: List[str] = Field(..., description="Concrete topics or resources suggested to study")
    topic_breakdown: List[TopicBreakdownItem]
    summary_report: str = Field(..., description="Multi-paragraph summary evaluation report")


# --- Cryptographic Helpers for Authentication ---
def hash_password(password: str) -> str:
    """
    Generates a secure salt and hashes the password using PBKDF2 with SHA-256.
    Stores the hash in the format: 'salt:hex_hash'
    """
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    )
    return f"{salt}:{pwd_hash.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Splits the salt and stored hash, re-hashes the user input, and verifies matches.
    """
    try:
        salt, stored_hash = hashed_password.split(":")
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt.encode('utf-8'), 
            100000
        )
        return pwd_hash.hex() == stored_hash
    except Exception:
        return False

# --- Pydantic Schemas for Authentication ---
class UserSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Candidate's full name")
    email: str = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")

class UserLogin(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")

# Structured JSON output schema for Gemini 2.5 Flash
RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "overall_score": {
            "type": "INTEGER",
            "description": "Overall score out of 100 representing candidate execution."
        },
        "hiring_verdict": {
            "type": "STRING",
            "enum": ["Strong Hire", "Hire", "Lean Hire", "No Hire"],
            "description": "Decision recommendation representing candidate readiness."
        },
        "metrics": {
            "type": "OBJECT",
            "properties": {
                "technical_depth": {
                    "type": "INTEGER",
                    "description": "Score from 1 to 10 evaluating core concepts knowledge."
                },
                "problem_solving": {
                    "type": "INTEGER",
                    "description": "Score from 1 to 10 evaluating handling scale and algorithmic edge cases."
                },
                "communication": {
                    "type": "INTEGER",
                    "description": "Score from 1 to 10 evaluating clarity of structured explanations."
                },
                "system_design": {
                    "type": "INTEGER",
                    "description": "Score from 1 to 10 evaluating design patterns and trade-off selections."
                }
            },
            "required": ["technical_depth", "problem_solving", "communication", "system_design"]
        },
        "strengths": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Key positive performance indicators observed."
        },
        "gaps_and_weaknesses": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Concepts misunderstood or weak explanations given."
        },
        "actionable_suggestions": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Actionable advice, resources, or study topics."
        },
        "topic_breakdown": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "subtopic": {"type": "STRING"},
                    "proficiency_level": {"type": "STRING", "enum": ["Beginner", "Intermediate", "Advanced"]},
                    "observation": {"type": "STRING"}
                },
                "required": ["subtopic", "proficiency_level", "observation"]
            }
        },
        "summary_report": {
            "type": "STRING",
            "description": "Detailed multi-paragraph breakdown of candidate performance."
        }
    },
    "required": [
        "overall_score",
        "hiring_verdict",
        "metrics",
        "strengths",
        "gaps_and_weaknesses",
        "actionable_suggestions",
        "topic_breakdown",
        "summary_report"
    ]
}

@app.post("/api/signup")
def signup(data: UserSignup):
    """
    Registers a new candidate, hashes their password, and logs them in.
    """
    # Check if user already exists
    existing_user = get_user_by_email(data.email.strip().lower())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash the password and save the user
    hashed = hash_password(data.password)
    try:
        user_id = create_user(
            name=data.name.strip(),
            email=data.email.strip().lower(),
            password_hash=hashed
        )
        return {
            "status": "success",
            "user": {
                "id": user_id,
                "name": data.name.strip(),
                "email": data.email.strip().lower()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/api/login")
def login(data: UserLogin):
    """
    Authenticates a user's credentials against their hashed database record.
    """
    user = get_user_by_email(data.email.strip().lower())
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Verify password hash
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    return {
        "status": "success",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }

@app.get("/api/user/{user_id}/sessions")
def get_user_history(user_id: int):
    """
    Fetches all past mock interview sessions associated with a specific candidate ID.
    """
    sessions = get_user_sessions(user_id)
    return sessions

@app.get("/health")
def health_check():
    """
    A simple health check endpoint to verify the server is running.
    """
    return {
        "status": "healthy",
        "database": "connected"
    }

@app.post("/api/evaluate", response_model=ScorecardOutput)
@limiter.limit("5/minute")
async def evaluate_interview(request: Request, data: ScorecardInput):
    """
    Evaluates an interview transcript using Gemini 2.5 Flash, saves the session and
    generated scorecard to MySQL, and returns the structured scorecard.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured on the server."
        )

    # Format the transcript text for the prompt
    formatted_transcript = ""
    for item in data.transcript:
        role_label = "Interviewer" if item.role == "interviewer" else "Candidate"
        formatted_transcript += f"{role_label}: {item.text}\n"

    # Call Gemini REST API for JSON schema generation
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": EVALUATION_SYSTEM_PROMPT},
                    {"text": f"Evaluate this technical mock interview ({data.round_type}):\n\n{formatted_transcript}"}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API returned error: {resp.text}"
                )
            
            resp_json = resp.json()
            content_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            scorecard_data = json.loads(content_text)
            
            # Database Hook: Save the scorecard and transcript to MySQL database
            save_interview_session(
                session_id=data.session_id,
                round_type=data.round_type,
                transcript=[{"role": item.role, "text": item.text} for item in data.transcript],
                scorecard=scorecard_data,
                user_id=data.user_id # Added
            )
            
            return scorecard_data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse scorecard JSON returned by Gemini."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation error: {str(e)}"
        )

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    """
    Retrieves previous scorecard and transcript from MySQL by unique session UUID.
    """
    result = get_interview_session(session_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session ID not found in database."
        )
    return result

class ChatItem(BaseModel):
    role: str = Field(..., description="Role: 'candidate' or 'interviewer'")
    text: str = Field(..., description="Text content of the turn")

class ChatInput(BaseModel):
    round_type: str = Field(..., description="The interview round type")
    transcript: List[ChatItem] = Field(..., description="Full history of the interview")

@app.post("/api/chat")
async def chat_with_interviewer(data: ChatInput):
    """
    Handles text-based mock interview exchanges using Gemini 3.5 Flash via REST.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured on the server."
        )

    # Format the contents parameter for Gemini API
    # Gemini roles must alternate: user (candidate) -> model (interviewer)
    contents = []
    
    # If the transcript is empty, send a default starter prompt to boot the conversation
    if len(data.transcript) == 0:
        contents.append({
            "role": "user",
            "parts": [{"text": "Hello! I am ready to start the mock interview. Please introduce yourself and ask the first question."}]
        })
    else:
        for item in data.transcript:
            gemini_role = "user" if item.role == "candidate" else "model"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": item.text}]
            })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    system_instruction = SYSTEM_PROMPTS.get(data.round_type, "")
    
    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API returned error: {resp.text}"
                )
            resp_json = resp.json()
            ai_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            return {"text": ai_text}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat generation error: {str(e)}"
        )

@app.websocket("/ws/interview/{round_type}")
async def ws_interview(websocket: WebSocket, round_type: str, token: str = None):
    """
    Bidirectional WebSocket proxy connecting client browser to Gemini Live API.
    """
    # 1. Validation check
    if token != SECURE_HANDSHAKE_TOKEN:
        await websocket.close(code=4001, reason="Invalid handshake token")
        return
        
    if round_type not in SYSTEM_PROMPTS:
        await websocket.close(code=4002, reason="Invalid interview round type")
        return

    # Accept the client connection
    await websocket.accept()

    if not GEMINI_API_KEY:
        await websocket.close(code=4003, reason="Gemini API Key is not configured on backend")
        return

    # 2. Establish connection to Gemini Multimodal Live API
    gemini_uri = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={GEMINI_API_KEY}"

    try:
        async with websockets.connect(gemini_uri) as gemini_ws:
            # 3. Send setup configuration parameters to Gemini
            setup_msg = {
                "setup": {
                    "model": "models/gemini-3.1-flash-live-preview",
                    "generationConfig": {
                        "responseModalities": ["TEXT"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": "Aoede"  # Default female voice
                                }
                            }
                        }
                    },
                    "systemInstruction": {
                        "parts": [
                            {
                                "text": SYSTEM_PROMPTS[round_type]
                            }
                        ]
                    },
                    "inputAudioTranscription": {},
                    "outputAudioTranscription": {}
                }
            }
            await gemini_ws.send(json.dumps(setup_msg))

            # Receive setup confirmation from Gemini and forward to client
            setup_resp = await gemini_ws.recv()
            await websocket.send_text(setup_resp)

            # 4. Bidirectional relay loops
            async def forward_client_to_gemini():
                try:
                    while True:
                        msg = await websocket.receive()
                        if "bytes" in msg:
                            # Forward raw PCM16 microphone bytes as base64 mediaChunks
                            pcm_bytes = msg["bytes"]
                            b64_data = base64.b64encode(pcm_bytes).decode("utf-8")
                            payload = {
                                "realtimeInput": {
                                    "mediaChunks": [
                                        {
                                            "mimeType": "audio/pcm;rate=16000",
                                            "data": b64_data
                                        }
                                    ]
                                }
                            }
                            await gemini_ws.send(json.dumps(payload))
                        elif "text" in msg:
                            # Forward text chats / control commands directly
                            await gemini_ws.send(msg["text"])
                except (websockets.exceptions.ConnectionClosed, WebSocketDisconnect):
                    pass

            async def forward_gemini_to_client():
                try:
                    async for response in gemini_ws:
                        if isinstance(response, bytes):
                            await websocket.send_bytes(response)
                        else:
                            await websocket.send_text(response)
                except (websockets.exceptions.ConnectionClosed, WebSocketDisconnect):
                    pass

            # Execute bidirectional loops concurrently
            await asyncio.gather(forward_client_to_gemini(), forward_gemini_to_client())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error in WebSocket proxy: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass