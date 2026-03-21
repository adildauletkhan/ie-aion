import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost";
}

export function ShimmerButton({ children, variant = "primary", className = "", ...props }: ShimmerButtonProps) {
  const base =
    "relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

  if (variant === "ghost") {
    return (
      <button
        className={`${base} ${className}`}
        style={{
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.22)",
          color: "#0D9488",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.14)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,148,136,0.40)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.08)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,148,136,0.22)";
        }}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={`${base} ${className}`}
      style={{
        background: "linear-gradient(135deg, #0D9488, #5CE0D6, #0D9488)",
        backgroundSize: "200% auto",
        border: "1px solid rgba(92,224,214,0.40)",
        color: "#fff",
        boxShadow: "0 0 16px rgba(92,224,214,0.25)",
        animation: "shimmer 2.5s linear infinite",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 28px rgba(92,224,214,0.40)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(92,224,214,0.25)";
      }}
      {...props}
    >
      {children}
    </button>
  );
}
