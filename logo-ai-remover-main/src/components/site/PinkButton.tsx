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
    sm: "px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wide rounded-lg min-h-[40px]",
    md: "px-6 py-3 text-sm sm:text-base font-black uppercase tracking-wide rounded-lg min-h-[48px]",
    lg: "px-8 py-4 text-base sm:text-lg font-black uppercase tracking-wide rounded-lg min-h-[54px]",
  };

  const variantClasses = {
    primary:
      "bg-[#d0f471] hover:bg-[#ffe500] !text-[#0b0f0d] text-[#0b0f0d] font-black [&_*]:!text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_#0b0f0d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150",
    forest:
      "bg-[#0b0f0d] hover:bg-[#1a2420] !text-white text-white [&_*]:!text-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#d0f471] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150",
    outline:
      "bg-white text-[#0b0f0d] hover:bg-[#ffe500] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_#0b0f0d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150",
    soft:
      "bg-[#f7f5ee] text-[#0b0f0d] hover:bg-[#a8e6cf] border-[2px] border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-bold transition-all duration-150",
    ghost:
      "bg-white/0 text-[#0b0f0d] hover:bg-[#ffe500] border-[2px] border-transparent hover:border-[#0b0f0d] transition-all duration-150",
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
