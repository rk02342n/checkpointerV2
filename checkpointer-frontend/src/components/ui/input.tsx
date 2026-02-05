import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary/30 h-10 w-full min-w-0 rounded-none border-4 border-border bg-input px-3 py-2 text-base text-foreground transition-all file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-0",
        "aria-invalid:ring-rose-500 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
