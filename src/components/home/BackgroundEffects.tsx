import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacitySpeed: number;
}

export function BackgroundEffects() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 40;
    particlesRef.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25 - 0.05,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.45 + 0.08,
      opacitySpeed: (Math.random() - 0.5) * 0.003,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dark = isDarkRef.current;
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.5) p.opacitySpeed = -Math.abs(p.opacitySpeed);
        if (p.opacity < 0.04) p.opacitySpeed = Math.abs(p.opacitySpeed);
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(92, 224, 214, ${p.opacity})`
          : `rgba(13, 148, 136, ${p.opacity * 0.35})`;
        ctx.fill();
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
      {/* Base background */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ background: isDark ? "#0A0F1C" : "#F0F9F7" }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 animate-grid-pulse transition-opacity duration-500"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(rgba(92,224,214,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(92,224,214,0.04) 1px, transparent 1px)`
            : `linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient gradient orbs */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full animate-float-slow"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(92,224,214,0.08) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(13,148,136,0.10) 0%, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute -bottom-40 -right-20 w-[700px] h-[700px] rounded-full animate-float-slow"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(250,204,21,0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(202,138,4,0.08) 0%, transparent 70%)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full animate-float"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(251,146,60,0.04) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(234,88,12,0.06) 0%, transparent 70%)",
          animationDelay: "-14s",
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: isDark ? 0.65 : 0.45 }}
      />

      {/* Scanline — dark mode only */}
      {isDark && (
        <div
          className="absolute left-0 right-0 h-[2px] animate-scanline"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(92,224,214,0.04), transparent)",
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 40%, rgba(10,15,28,0.55) 100%)"
            : "radial-gradient(ellipse at center, transparent 40%, rgba(220,240,235,0.45) 100%)",
        }}
      />
    </div>
  );
}
