import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface PinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
  children: React.ReactNode;
}

export const PinkButton: React.FC<PinkButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  asChild = false,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs font-semibold rounded-xl",
    md: "px-5 py-2.5 text-sm font-semibold rounded-2xl",
    lg: "px-7 py-3.5 text-base font-semibold rounded-2xl",
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_6px_20px_-4px_rgba(225,29,72,0.4)] hover:shadow-[0_10px_28px_-4px_rgba(225,29,72,0.55)] hover:scale-[1.02] active:scale-[0.98] border border-white/20 transition-all duration-200",
    outline:
      "bg-white text-[#E11D48] border-2 border-[#E11D48] hover:bg-[#FFF1F4] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
    soft:
      "bg-[#FFF1F4] text-[#E11D48] hover:bg-[#FFE4E9] border border-[#FCE7EC] font-semibold transition-all duration-200",
    ghost:
      "bg-transparent text-gray-700 hover:text-[#E11D48] hover:bg-[#FFF5F7] transition-all duration-200",
  };

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer select-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
};
