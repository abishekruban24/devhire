import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
        secondary:
          "border border-slate-700 bg-slate-800/80 text-slate-300",
        outline:
          "border border-slate-700/80 text-slate-400",
        violet:
          "border border-violet-500/30 bg-violet-500/10 text-violet-400",
        indigo:
          "border border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
        success:
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        warning:
          "border border-amber-500/30 bg-amber-500/10 text-amber-400",
        danger:
          "border border-rose-500/30 bg-rose-500/10 text-rose-400",
        mock:
          "border border-amber-500/40 bg-amber-500/10 text-amber-300 tracking-wide font-mono uppercase text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
