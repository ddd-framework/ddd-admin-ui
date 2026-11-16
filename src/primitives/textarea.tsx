import * as React from "react"
import { cn } from "./cn.ts"
import { FIELD_FOCUS_CLASS, FIELD_RADIUS_CLASS, FIELD_SURFACE_CLASS } from "./fieldSurface.ts"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Shape by role: the same 12 px field as Input.
        "flex field-sizing-content min-h-16 w-full px-3 py-2 text-base placeholder:text-muted-foreground md:text-sm",
        FIELD_SURFACE_CLASS,
        FIELD_RADIUS_CLASS,
        FIELD_FOCUS_CLASS,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
