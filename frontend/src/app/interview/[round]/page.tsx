"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Loader2,
  Lock,
  Send,
  PhoneOff
} from "lucide-react";

import ScorecardModal from "@/components/ScorecardModal";

interface TranscriptItem {
  role: "candidate" | "interviewer";
  text: string;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roundType = params.round as string;
  const historySessionId = searchParams.get("session_id");

  // State Machine
  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "grading" | "completed">("idle");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [scorecard, setScorecard] = useState<any | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // References
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll transcript to the bottom on new turns
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isAiTyping]);

  // Hook to handle historical scorecard loading from URL parameter
  useEffect(() => {
    if (historySessionId) {
      loadSavedSession(historySessionId);
    } else {
      // Generate a fresh session UUID for a new mock interview
      setSessionId(self.crypto.randomUUID());
    }
  }, [historySessionId]);

  const loadSavedSession = async (sid: string) => {
    setStatus("grading");
    setSessionId(sid);
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/session/${sid}`);
      if (resp.ok) {
        const data = await resp.json();
        setTranscript(data.transcript);
        setScorecard(data.scorecard);
        setIsScorecardOpen(true);
        setStatus("completed");
      } else {
        alert("Session ID not found in database.");
        router.push("/");
      }
    } catch (err) {
      alert("Error connecting to backend database.");
      router.push("/");
    }
  };

  const startInterviewSession = async () => {
    setStatus("connecting");
    setTranscript([]);
    setIsAiTyping(true);

    try {
      // Call standard REST API to start the session
      const resp = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_type: roundType,
          transcript: [] // Sending empty history triggers opening question
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setTranscript([
          { role: "interviewer", text: data.text }
        ]);
        setStatus("active");
      } else {
        const errorData = await resp.json().catch(() => ({}));
        alert(errorData.detail || "Failed to connect to the AI interviewer.");
        setStatus("idle");
      }
    } catch (err) {
      alert("Error communicating with mock interview server. Make sure the backend is running.");
      setStatus("idle");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiTyping) return;

    const message = userInput.trim();
    setUserInput("");

    // 1. Add user message locally
    const updatedTranscript = [
      ...transcript,
      { role: "candidate", text: message }
    ] as TranscriptItem[];

    setTranscript(updatedTranscript);
    setIsAiTyping(true);

    try {
      // 2. POST the updated transcript list to get the next turn
      const resp = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_type: roundType,
          transcript: updatedTranscript
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setTranscript([
          ...updatedTranscript,
          { role: "interviewer", text: data.text }
        ]);
      } else {
        const errorData = await resp.json().catch(() => ({}));
        alert(errorData.detail || "AI failed to respond. Check backend server.");
      }
    } catch (err) {
      alert("Network error connecting to interview backend.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const endInterviewSession = async () => {
    setStatus("grading");

    // Filter empty turns
    const validTranscript = transcript.filter(t => t.text.trim().length > 0);

    if (validTranscript.length === 0) {
      alert("No conversation turns recorded. Unable to generate scorecard.");
      router.push("/");
      return;
    }

    // Retrieve the active User ID from local storage (if logged in)
    let userId: number | null = null;
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        userId = parsed.id;
      } catch (e) {
        console.error("Failed to parse stored user session:", e);
      }
    }

    try {
      // Trigger Evaluation REST endpoint
      const resp = await fetch("http://127.0.0.1:8000/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          round_type: roundType,
          transcript: validTranscript,
          user_id: userId // Associated user id (passed dynamically)
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setScorecard(data);
        setIsScorecardOpen(true);
        setStatus("completed");
      } else {
        const errorData = await resp.json().catch(() => ({}));
        alert(errorData.detail || "Failed to grade transcript. Check key setups.");
        setStatus("idle");
      }
    } catch (err) {
      alert("Network error connecting to evaluation server.");
      setStatus("idle");
    }
  };


  const getRoundTitle = (type: string) => {
    switch (type) {
      case "oa_dsa":
        return "Online Assessment / DSA Room";
      case "core_cse":
        return "Core CSE Fundamentals Room";
      case "resume_lld":
        return "Resume & LLD Design Room";
      default:
        return "HR Behavioral Room";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col h-screen relative">

      {/* Navbar header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <button
          onClick={() => {
            router.push("/");
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Room
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-mono select-none">
          <Lock className="w-3 h-3 text-indigo-400" /> SECURE TEXT SESSION
        </div>
      </div>

      {/* Main Workspace splits between Info Header and Chat Transcript */}
      <div className="flex-grow flex flex-col overflow-hidden mb-6 space-y-4">

        {/* Info panel */}
        <div className="glass p-5 rounded-2xl shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-white/5 to-transparent gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Track</span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{getRoundTitle(roundType)}</h2>
          </div>
          {status === "active" && (
            <button
              onClick={endInterviewSession}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-xs font-bold text-white shadow-lg shadow-rose-600/20"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End & Grade Session
            </button>
          )}
        </div>

        {/* Live chat window */}
        <div className="flex-grow glass rounded-2xl flex flex-col overflow-hidden bg-slate-900/20 border border-white/5 relative">
          <div className="px-5 py-3 border-b border-white/5 bg-slate-950/40 flex items-center gap-2 text-slate-300 font-bold text-xs select-none">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Live Interview Dialogue Transcript
          </div>

          <div className="flex-grow overflow-y-auto p-5 space-y-5">
            {transcript.length === 0 && !isAiTyping ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 select-none">
                <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse-slow" />
                <h5 className="font-bold text-sm text-slate-300">Ready to start?</h5>
                <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
                  Start the session to chat live with your AI Coach. Respond to technical questions, and click End & Grade when done.
                </p>
                {status === "idle" && (
                  <button
                    onClick={startInterviewSession}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition text-xs font-bold text-white shadow-lg"
                  >
                    Start Session
                  </button>
                )}
              </div>
            ) : (
              <>
                {transcript.map((item, index) => {
                  const isUser = item.role === "candidate";
                  // Render empty text slots (placeholder turns) as loading
                  if (item.text === "") return null;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                        {isUser ? "You (Candidate)" : "AI Interview Coach"}
                      </span>
                      <div className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${isUser
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none"
                        }`}>
                        {item.text}
                      </div>
                    </div>
                  );
                })}

                {/* Visual indicator when AI is generating its response */}
                {isAiTyping && (
                  <div className="flex flex-col gap-1 mr-auto items-start max-w-[80%]">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 animate-pulse">
                      AI Interview Coach is typing...
                    </span>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-none flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Chat text input box at the bottom */}
          {status === "active" && (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-950/40 flex gap-3 items-center">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isAiTyping ? "AI is replying..." : "Type your explanation or answer here..."}
                disabled={isAiTyping}
                className="flex-grow px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isAiTyping}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Control panel status bars */}
      <div className="shrink-0 flex justify-center items-center gap-4 py-2">
        {status === "connecting" && (
          <button
            disabled
            className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Triggering AI Interview Greet...
          </button>
        )}

        {status === "grading" && (
          <button
            disabled
            className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Analyzing Written Dialogue & Saving to MySQL...
          </button>
        )}

        {status === "completed" && (
          <div className="flex gap-4">
            <button
              onClick={() => setIsScorecardOpen(true)}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
            >
              Review Performance Scorecard
            </button>
            <button
              onClick={() => {
                setStatus("idle");
                setTranscript([]);
              }}
              className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300"
            >
              Restart Round
            </button>
          </div>
        )}
      </div>

      {/* Scorecard Modal overlay */}
      <ScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        scorecard={scorecard}
        sessionId={sessionId}
      />
    </div>
  );
}
