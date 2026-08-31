"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Cpu,
  Layers,
  Globe,
  Search,
  ArrowRight,
  Sparkles,
  History,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  User as Usericon,
  Calendar
} from "lucide-react";

interface InterviewTrack {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  difficulty: "Medium" | "Hard" | "Adaptive";
  topics: string[];
  gradient: string;
  glow: string;
}

export default function Home() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Authentication States ---
  interface User {
    id: number;
    name: string;
    email: string;
  }
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- MySQL History State ---
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "reload">("history");

  const tracks: InterviewTrack[] = [
    {
      id: "oa_dsa",
      title: "Online Assessment (OA) / DSA",
      subtitle: "Verbal Algorithm Walkthrough & Complexity Analysis",
      description:
        "Practice verbalizing complex algorithm design, explaining data structures trade-offs, and calculating time/space Big-O bounds. Exercises edge case coverage.",
      icon: Cpu,
      difficulty: "Hard",
      topics: ["Algorithms", "Data Structures", "Big-O", "Edge Cases"],
      gradient: "from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20",
      glow: "group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    },
    {
      id: "core_cse",
      title: "Core CSE Fundamentals",
      subtitle: "Adaptive Difficulty DBMS, OS, Networks & OOP Check",
      description:
        "Select your focal subject and answer questions that dynamically scale from basic ideas to complex constructs like MVCC, TCP sliding windows, and vtables.",
      icon: Terminal,
      difficulty: "Adaptive",
      topics: ["Operating Systems", "DBMS", "Computer Networks", "OOP"],
      gradient: "from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20",
      glow: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    },
    {
      id: "resume_lld",
      title: "Resume & Machine Coding / LLD",
      subtitle: "Concurrency, Database Schema & Trade-off Justification",
      description:
        "Defend low-level architectural patterns, thread-safety mechanics, database indices, locking mechanisms, and project design trade-offs.",
      icon: Layers,
      difficulty: "Medium",
      topics: ["Low-Level Design", "Concurrency", "Database Schema", "Patterns"],
      gradient: "from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20",
      glow: "group-hover:border-violet-500/50 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    },
    {
      id: "hr_behavioral",
      title: "HR & Behavioral Round",
      subtitle: "STAR Method Evaluated Situational Questions",
      description:
        "Answer behavioral queries regarding teamwork, project ownership, conflict resolutions, and tight timelines. AI reviews structure strictly against STAR guidelines.",
      icon: Globe,
      difficulty: "Medium",
      topics: ["STAR Method", "Leadership", "Conflict Resolution", "Ownership"],
      gradient: "from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20",
      glow: "group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    },
  ];

  const startInterview = (trackId: string) => {
    router.push(`/interview/${trackId}`);
  };

  const handleReloadSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) return;

    setError("");
    setLoading(true);

    try {
      // Query the backend directly to see if this session exists in MySQL
      const resp = await fetch(`http://127.0.0.1:8000/api/session/${sessionId.trim()}`);
      if (resp.ok) {
        const data = await resp.json();
        // Redirect the user to the live page, appending the session_id to auto-trigger the scorecard modal
        router.push(`/interview/${data.round_type}?session_id=${sessionId.trim()}`);
      } else {
        const errorData = await resp.json().catch(() => ({}));
        setError(errorData.detail || "Session ID not found in database.");
      }
    } catch (err) {
      setError("Unable to connect to the backend server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };
  // 1. Check for logged-in user session on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        fetchUserSessions(parsed.id);
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // 2. Fetch all past interview runs for the logged-in candidate
  const fetchUserSessions = async (userId: number) => {
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/user/${userId}/sessions`);
      if (resp.ok) {
        const data = await resp.json();
        setUserSessions(data);
      }
    } catch (err) {
      console.error("Failed to load interview history:", err);
    }
  };

  // 3. Handle Login or Signup submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const url = authMode === "signin"
      ? "http://127.0.0.1:8000/api/login"
      : "http://127.0.0.1:8000/api/signup";

    const payload = authMode === "signin"
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (resp.ok) {
        // Save user details locally and update active state
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        fetchUserSessions(data.user.id);

        // Reset forms
        setAuthName("");
        setAuthEmail("");
        setAuthPassword("");
      } else {
        setAuthError(data.detail || "Authentication request failed.");
      }
    } catch (err) {
      setAuthError("Failed to connect to authentication server. Verify uvicorn is running.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setUserSessions([]);
    setAuthError("");
  };


  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col lg:flex-row items-center justify-center min-h-screen gap-12 relative overflow-hidden">

        {/* Glow Effects */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[160px] -left-20" />
          <div className="w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[140px] -right-20" />
        </div>

        {/* Left Hand Side: Landing Copy */}
        <div className="flex-1 space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation AI Mock Interviews
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Master Your Technical{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Mock Interviews
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Practice algorithmic DSA, system fundamentals, and behavioral questions.
            Engage with a stateful AI coach, reply in text, and get detailed scorecards persisted directly in MySQL database.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">✓</div>
              <p className="text-xs text-slate-400 font-medium">4 Specialized tracks tailored for top tech company loops.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">✓</div>
              <p className="text-xs text-slate-400 font-medium">Structured metrics and action guides scored by Gemini.</p>
            </div>
          </div>
        </div>

        {/* Right Hand Side: Sign In / Sign Up Form Card */}
        <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl relative bg-slate-900/40 z-10">

          {/* Header toggle buttons */}
          <div className="flex border-b border-white/5 pb-4 mb-6">
            <button
              onClick={() => { setAuthMode("signin"); setAuthError(""); }}
              className={`flex-1 pb-2 text-center text-sm font-bold transition-all ${authMode === "signin" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setAuthError(""); }}
              className={`flex-1 pb-2 text-center text-sm font-bold transition-all ${authMode === "signup" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">

            {/* Full Name input (Sign Up Only) */}
            {authMode === "signup" && (
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Email input */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="e.g. arun@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Password input with Visibility Toggle */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Please wait...
                </>
              ) : (
                authMode === "signin" ? "Sign In to Account" : "Create Account"
              )}
            </button>
          </form>

          {/* Error Alert Box */}
          {authError && (
            <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/10 p-3 rounded-lg animate-pulse-slow">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Authenticated Dashboard View ---
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-screen">

      {/* Header showing Username and Logout button */}
      <header className="w-full flex justify-between items-center mb-12 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-extrabold uppercase select-none">
            {user.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white leading-tight">Welcome, {user.name}!</h4>
            <span className="text-[10px] text-slate-400 font-medium font-mono">{user.email}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 hover:text-white transition font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      <div className="text-center max-w-2xl space-y-4 mb-16 relative">
        <div className="absolute inset-0 -top-24 flex items-center justify-center pointer-events-none">
          <div className="w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-4 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" /> Next-Generation AI Mock Interviews
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Select Your Interview Track
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
          Select a track below to practice. Complete the round, and the AI will analyze your inputs and generate a comprehensive performance report.
        </p>
      </div>

      {/* Grid track cards selector */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-16">
        {tracks.map((track) => {
          const Icon = track.icon;
          return (
            <div
              key={track.id}
              onClick={() => startInterview(track.id)}
              className="group cursor-pointer"
            >
              <div className={`h-full flex flex-col justify-between p-6 rounded-2xl glass transition-all duration-300 ${track.gradient} border border-white/5 ${track.glow}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 group-hover:text-white transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border ${track.difficulty === "Hard"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : track.difficulty === "Adaptive"
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                      {track.difficulty}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition duration-300">
                      {track.title}
                    </h2>
                    <p className="text-xs font-medium text-slate-400">
                      {track.subtitle}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {track.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5 items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {track.topics.map((topic) => (
                      <span key={topic} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    Start Mock Interview <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Personalized History and Session Reload Panel */}
      <section className="glass rounded-2xl p-6 md:p-8 max-w-2xl w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Header Tabs */}
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("history")}
              className={`text-sm font-bold pb-2 transition-all border-b-2 ${activeTab === "history" ? "text-indigo-400 border-indigo-500" : "text-slate-400 hover:text-white border-transparent"}`}
            >
              Your Past Runs ({userSessions.length})
            </button>
            <button
              onClick={() => setActiveTab("reload")}
              className={`text-sm font-bold pb-2 transition-all border-b-2 ${activeTab === "reload" ? "text-indigo-400 border-indigo-500" : "text-slate-400 hover:text-white border-transparent"}`}
            >
              Search Session ID
            </button>
          </div>
        </div>

        {/* Tab content 1: History List */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {userSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                No past mock interviews recorded yet. Complete a round above to view your scorecard!
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {userSessions.map((session) => {
                  const hasScorecard = !!session.scorecard;
                  const score = hasScorecard ? session.scorecard.overall_score : 0;
                  const verdict = hasScorecard ? session.scorecard.hiring_verdict : "N/A";

                  // Helper function to map track titles
                  const getTrackTitle = (type: string) => {
                    if (type === "oa_dsa") return "Online Assessment / DSA";
                    if (type === "core_cse") return "Core CSE Fundamentals";
                    if (type === "resume_lld") return "Resume & LLD Design";
                    return "HR Behavioral";
                  };

                  return (
                    <div
                      key={session.id}
                      onClick={() => router.push(`/interview/${session.round_type}?session_id=${session.session_id}`)}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 active:scale-[0.99] transition cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{getTrackTitle(session.round_type)}</span>
                          <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">({session.session_id.substring(0, 8)}...)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-semibold">{verdict}</span>
                          <span>•</span>
                          <span>{new Date(session.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-indigo-400 font-mono">{score}%</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab content 2: Reload Search Form */}
        {activeTab === "reload" && (
          <div className="space-y-4">
            <form onSubmit={handleReloadSession} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !sessionId.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-sm font-semibold text-white disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Load Scorecard"
                )}
              </button>
            </form>

            {error && (
              <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}  
