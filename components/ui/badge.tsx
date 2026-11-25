import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-white shadow",
        secondary: "border-transparent bg-slate-100 text-slate-900",
        destructive: "border-transparent bg-red-500 text-white shadow",
        outline: "text-slate-950",
        pending: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
        submitted: "border-blue-200 bg-blue-50 text-blue-800 font-medium",
        approved: "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium",
        rejected: "border-rose-200 bg-rose-50 text-rose-800 font-medium",
        roleAdmin: "border-purple-200 bg-purple-50 text-purple-700 font-medium uppercase tracking-wide",
        roleManager: "border-indigo-200 bg-indigo-50 text-indigo-700 font-medium uppercase tracking-wide",
        roleEmployee: "border-teal-200 bg-teal-50 text-teal-700 font-medium uppercase tracking-wide",
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
