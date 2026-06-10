import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-md hover:shadow-lg active:scale-95":
            variant === "primary",
          "bg-white text-primary border-2 border-primary hover:bg-blue-50 focus:ring-primary":
            variant === "secondary",
          "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300":
            variant === "ghost",
          "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400":
            variant === "danger",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2.5 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
          "w-full": fullWidth,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
