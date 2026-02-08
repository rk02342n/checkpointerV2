import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-semibold rounded-none border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:brightness-110 active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px]",
        destructive:
          "bg-rose-500 text-white font-semibold rounded-none border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:bg-rose-600 active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px]",
        outline:
          "bg-card text-foreground font-semibold rounded-none border-4 border-border shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:bg-muted active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px]",
        secondary:
          "bg-muted text-foreground font-semibold rounded-none border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:brightness-95 active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px]",
        ghost:
          "hover:bg-muted hover:text-foreground rounded-none",
        link: "text-primary underline-offset-4 hover:underline",
        pop: "bg-card text-foreground font-semibold rounded-none border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
