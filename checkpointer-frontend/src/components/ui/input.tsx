import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-stone-900 placeholder:text-stone-400 selection:bg-orange-300/30 h-10 w-full min-w-0 rounded-none border-4 border-stone-900 bg-white px-3 py-2 text-base text-stone-900 transition-all file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-0",
        "aria-invalid:ring-rose-500 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
