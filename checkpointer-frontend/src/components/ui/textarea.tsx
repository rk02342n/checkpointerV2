import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground flex field-sizing-content min-h-24 w-full rounded-none border-2 border-border bg-input px-3 py-2 text-base text-foreground transition-all outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:ring-rose-500 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
