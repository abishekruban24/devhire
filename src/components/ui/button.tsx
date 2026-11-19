import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/40 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-900/50 active:scale-[0.98]",
        accent:
          "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-violet-950/40 hover:from-indigo-500 hover:to-violet-500 hover:shadow-violet-900/50 active:scale-[0.98]",
        secondary:
          "bg-slate-800/80 text-slate-100 border border-slate-700/60 hover:bg-slate-750 hover:bg-slate-700 hover:text-white active:scale-[0.98]",
        outline:
          "border border-slate-700/80 bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 active:scale-[0.98]",
        ghost:
          "text-slate-300 hover:bg-slate-800/60 hover:text-white active:scale-[0.98]",
        danger:
          "bg-rose-600 text-white hover:bg-rose-500 shadow-sm active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base font-semibold",
        icon: "h-9 w-9 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
