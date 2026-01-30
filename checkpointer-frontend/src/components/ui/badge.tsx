import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-none border-2 border-stone-900 px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-orange-300 text-stone-900 [a&]:hover:bg-orange-400",
        secondary:
          "bg-stone-200 text-stone-900 [a&]:hover:bg-stone-300",
        destructive:
          "bg-rose-500 text-white [a&]:hover:bg-rose-600",
        outline:
          "bg-white text-stone-900 [a&]:hover:bg-stone-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
