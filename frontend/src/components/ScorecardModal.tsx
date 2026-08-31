"use client";

import React from "react";
import {
    X,
    Download,
    CheckCircle2,
    AlertTriangle,
    Bookmark,
    Briefcase,
    Compass,
    FileText
} from "lucide-react";

interface MetricScores {
    technical_depth: number;
    problem_solving: number;
    communication: number;
    system_design: number;
}

interface TopicBreakdownItem {
    subtopic: string;
    proficiency_level: string;
    observation: string;
}

interface ScorecardOutput {
    overall_score: number;
    hiring_verdict: string;
    metrics: MetricScores;
    strengths: string[];
    gaps_and_weaknesses: string[];
    actionable_suggestions: string[];
    topic_breakdown: TopicBreakdownItem[];
    summary_report: string;
}

interface ScorecardModalProps {
    isOpen: boolean;
    onClose: () => void;
    scorecard: ScorecardOutput | null;
    sessionId: string;
}

export default function ScorecardModal({
    isOpen,
    onClose,
    scorecard,
    sessionId,
}: ScorecardModalProps) {
    if (!isOpen || !scorecard) return null;

    // Verdict style mapping
    const getVerdictStyles = (verdict: string) => {
        switch (verdict) {
            case "Strong Hire":
                return { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]" };
            case "Hire":
                return { text: "text-teal-400", border: "border-teal-500/30", bg: "bg-teal-500/10", glow: "shadow-[0_0_20px_rgba(20,184,166,0.2)]" };
            case "Lean Hire":
                return { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]" };
            default:
                return { text: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10", glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]" };
        }
    };

    const getProficiencyBadge = (level: string) => {
        switch (level) {
            case "Advanced":
                return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
            case "Intermediate":
                return "bg-blue-500/10 border-blue-500/20 text-blue-400";
            default:
                return "bg-amber-500/10 border-amber-500/20 text-amber-400";
        }
    };

    const styles = getVerdictStyles(scorecard.hiring_verdict);

    // Compile scorecard to clean Markdown and trigger download
    const downloadMarkdownReport = () => {
        const mdContent = `# Technical Mock Interview Performance Report
**Session ID:** \`${sessionId}\`
**Hiring Verdict:** ${scorecard.hiring_verdict}
**Overall Performance Score:** ${scorecard.overall_score}%

---

## 1. Skill Metrics (Scores out of 10)
*   **Technical Depth:** ${scorecard.metrics.technical_depth}/10
*   **Problem Solving:** ${scorecard.metrics.problem_solving}/10
*   **Communication:** ${scorecard.metrics.communication}/10
*   **System Design & Architecture:** ${scorecard.metrics.system_design}/10

---

## 2. Topic Proficiency Breakdown
${scorecard.topic_breakdown.map(item => `
### 📘 ${item.subtopic}
*   **Proficiency Level:** ${item.proficiency_level}
*   **Feedback Observation:** ${item.observation}`).join("\n")}

---

## 3. Executive Evaluation Summary
${scorecard.summary_report}

---

## 4. Key Observed Strengths
${scorecard.strengths.map(strength => `*   ✅ ${strength}`).join("\n")}

---

## 5. Identified Conceptual Gaps & Weaknesses
${scorecard.gaps_and_weaknesses.map(gap => `*   ⚠️ ${gap}`).join("\n")}

---

## 6. Actionable Study Roadmap
${scorecard.actionable_suggestions.map(suggestion => `*   📚 ${suggestion}`).join("\n")}
`;

        const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `interview_scorecard_${sessionId}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-4xl glass rounded-3xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-pulse-slow">

                {/* Header bar */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">Interview Performance Scorecard</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadMarkdownReport}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold transition active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Markdown
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body content */}
                <div className="overflow-y-auto p-6 md:p-8 space-y-8 flex-grow">

                    {/* Top summary dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Overall wheel card */}
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 text-center relative">
                            <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                                {/* SVG circular track background */}
                                <svg className="absolute w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="54" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="54"
                                        className="stroke-indigo-500 fill-transparent transition-all duration-1000"
                                        strokeWidth="8"
                                        strokeDasharray={2 * Math.PI * 54}
                                        strokeDashoffset={2 * Math.PI * 54 * (1 - scorecard.overall_score / 100)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="text-3xl font-extrabold text-white">{scorecard.overall_score}%</span>
                            </div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Overall Score</p>
                        </div>

                        {/* Verdict Card */}
                        <div className={`flex flex-col justify-center p-6 rounded-2xl border ${styles.border} ${styles.bg} ${styles.glow}`}>
                            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1">Hiring Recommendation</span>
                            <h3 className={`text-2xl font-black ${styles.text}`}>{scorecard.hiring_verdict}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-2">
                                Hiring recommendation is formulated dynamically by weighing coding execution, technical accuracy, design patterns, and structure.
                            </p>
                        </div>

                        {/* Metrics progress listing */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Skills breakdown</h4>
                            <div className="space-y-3">
                                {[
                                    { name: "Technical Depth", val: scorecard.metrics.technical_depth },
                                    { name: "Problem Solving", val: scorecard.metrics.problem_solving },
                                    { name: "Communication", val: scorecard.metrics.communication },
                                    { name: "System Design", val: scorecard.metrics.system_design },
                                ].map(m => (
                                    <div key={m.name} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">{m.name}</span>
                                            <span className="text-white">{m.val}/10</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.val * 10}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Executive Summary Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-white font-bold border-b border-white/5 pb-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <h3>Executive Performance Report</h3>
                        </div>
                        <p className="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-line bg-white/5 border border-white/5 p-5 rounded-2xl">
                            {scorecard.summary_report}
                        </p>
                    </div>

                    {/* Grid lists: Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Strengths card */}
                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                            <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> Observed Strengths
                            </h4>
                            <ul className="space-y-2.5">
                                {scorecard.strengths.map((str, i) => (
                                    <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                                        <span>{str}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses card */}
                        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-4">
                            <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4.5 h-4.5 shrink-0" /> Conceptual Gaps / Weaknesses
                            </h4>
                            <ul className="space-y-2.5">
                                {scorecard.gaps_and_weaknesses.map((gap, i) => (
                                    <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                                        <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                                        <span>{gap}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Topic breakdown list */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white font-bold border-b border-white/5 pb-2">
                            <Compass className="w-4 h-4 text-indigo-400" />
                            <h3>Granular Topic Review</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {scorecard.topic_breakdown.map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-xs font-bold text-white">{item.subtopic}</span>
                                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${getProficiencyBadge(item.proficiency_level)}`}>
                                                {item.proficiency_level}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">
                                            {item.observation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actionable Study recommendations */}
                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                        <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                            <Bookmark className="w-4.5 h-4.5 shrink-0" /> Actionable Study Guide
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {scorecard.actionable_suggestions.map((sug, i) => (
                                <li key={i} className="text-xs text-slate-300 leading-relaxed p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{sug}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
            </div>
        </div>
    );
}
