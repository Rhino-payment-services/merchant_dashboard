import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center capitalize rounded-full border-0 w-fit px-2 py-1 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80",

        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",

        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/10",

        success:
          "bg-green-100 text-green-600 hover:bg-green-100",

        info:
          "bg-blue-100 text-blue-600 hover:bg-blue-100",

        warning:
          "bg-amber-100 text-amber-600 hover:bg-amber-100",

        danger:
          "bg-red-100 text-red-600 hover:bg-red-100",

        neutral:
          "bg-gray-100 text-gray-600 hover:bg-gray-100",

        outline:
          "border border-gray-200 text-foreground bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
