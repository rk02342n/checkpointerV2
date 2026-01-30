import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-stone-400 flex field-sizing-content min-h-24 w-full rounded-none border-4 border-stone-900 bg-white px-3 py-2 text-base text-stone-900 transition-all outline-none focus:ring-2 focus:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:ring-rose-500 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
