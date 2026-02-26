"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${e.clientX}px`;
      glowRef.current.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none z-0"
      style={{
        width: "600px",
        height: "600px",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)",
        transition: "left 0.12s ease, top 0.12s ease",
      }}
    />
  );
}
