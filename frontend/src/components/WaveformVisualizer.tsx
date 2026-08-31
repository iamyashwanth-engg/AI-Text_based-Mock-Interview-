"use client";

import React, { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
    analyser: AnalyserNode | null;
    color: string; // The fill color, e.g., "#6366f1" (Indigo) or "#10b981" (Emerald)
    isActive: boolean; // Pulsing state when active
}

export default function WaveformVisualizer({
    analyser,
    color,
    isActive,
}: WaveformVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Handle high-DPI displays for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const midY = height / 2;

        // Set up frequency data buffer
        const bufferLength = analyser ? analyser.frequencyBinCount : 32;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            // Loop the drawing frame recursively
            animationRef.current = requestAnimationFrame(draw);

            // Clear the canvas for the next frame
            ctx.clearRect(0, 0, width, height);

            if (analyser && isActive) {
                // Retrieve the real-time frequency data
                analyser.getByteFrequencyData(dataArray);
            } else {
                // If inactive, render a flat baseline with tiny idle noise
                dataArray.fill(0);
            }

            const barWidth = 3;
            const gap = 3;
            // Fit visualizer within canvas width bounds
            const count = Math.min(bufferLength, Math.floor(width / (barWidth + gap)));

            ctx.fillStyle = color;

            for (let i = 0; i < count; i++) {
                let val = dataArray[i];

                // Add a gentle idle wave when active but silent
                if (isActive && val < 5) {
                    val = 3 + Math.sin(Date.now() * 0.004 + i * 0.2) * 2;
                }

                const percent = val / 255;
                // Symmetrical pill height
                const barHeight = Math.max(4, percent * height * 0.85);
                const x = i * (barWidth + gap) + (width - count * (barWidth + gap)) / 2;

                // Draw symmetrical rounded pill bar
                ctx.beginPath();
                if (typeof (ctx as any).roundRect === "function") {
                    (ctx as any).roundRect(
                        x,
                        midY - barHeight / 2,
                        barWidth,
                        barHeight,
                        barWidth / 2
                    );
                } else {
                    // Fallback context mapping for older browsers
                    ctx.rect(x, midY - barHeight / 2, barWidth, barHeight);
                }
                ctx.fill();
            }
        };

        // Begin loop
        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, color, isActive]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block rounded-xl"
            style={{ minHeight: "64px" }}
        />
    );
}
