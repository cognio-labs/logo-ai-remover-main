import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface PinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "soft" | "forest";
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
    sm: "px-4 py-2 text-sm font-bold rounded-xl min-h-[40px]",
    md: "px-6 py-3 text-base font-bold rounded-2xl min-h-[48px]",
    lg: "px-8 py-4 text-lg font-bold rounded-2xl min-h-[56px]",
  };

  const variantClasses = {
    primary:
      "bg-[#d0f471] hover:bg-[#dbff83] !text-[#091712] text-[#091712] font-extrabold [&_*]:!text-[#091712] shadow-[0_6px_24px_-4px_rgba(208,244,113,0.45)] hover:shadow-[0_10px_32px_-4px_rgba(208,244,113,0.6)] hover:scale-[1.02] active:scale-[0.98] border border-[#d7f3af]/40 transition-all duration-200",
    forest:
      "bg-[#10241e] hover:bg-[#18362d] text-white shadow-md hover:scale-[1.02] active:scale-[0.98] border border-[#d7f3af]/20 transition-all duration-200",
    outline:
      "bg-white text-[#10241e] border-2 border-[#10241e]/20 hover:bg-[#e9ece4] hover:border-[#10241e] shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
    soft:
      "bg-[#e9ece4] text-[#10241e] hover:bg-[#dfe3da] border border-[#10241e]/15 font-bold transition-all duration-200",
    ghost:
      "bg-transparent text-[#37433d] hover:text-[#10241e] hover:bg-[#10241e]/10 transition-all duration-200",
  };

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer select-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d0f471] disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
};
