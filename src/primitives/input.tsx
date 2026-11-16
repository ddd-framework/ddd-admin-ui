import * as React from "react"
import { cn } from "./cn.ts"
import { FIELD_FOCUS_CLASS, FIELD_RADIUS_CLASS, FIELD_SURFACE_CLASS } from "./fieldSurface.ts"

/**
 * Password managers stay out of every field by default (they offer contact names in a "New folder" field and read
 * a single-input dialog as a login form): `data-1p-ignore` (1Password), `data-lpignore`
 * (LastPass), `data-bwignore` (Bitwarden), `data-form-type="other"` (Dashlane). Only real credential fields opt back in
 * with `passwordManager` (the login form).
 */
function Input({
  className,
  type,
  passwordManager = false,
  ...props
}: React.ComponentProps<"input"> & { passwordManager?: boolean }) {
  const passwordManagerIgnore = passwordManager
    ? {}
    : { "data-1p-ignore": "", "data-lpignore": "true", "data-bwignore": "true", "data-form-type": "other" }
  return (
    <input
      type={type}
      data-slot="input"
      {...passwordManagerIgnore}
      className={cn(
        // Shape by role: the 12 px field, card fill, quiet edge, strong edge on hover, 2 px focus ring.
        "h-9 w-full min-w-0 px-3 py-1 text-base selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none md:text-sm",
        FIELD_SURFACE_CLASS,
        FIELD_RADIUS_CLASS,
        FIELD_FOCUS_CLASS,
        className
      )}
      {...props}
    />
  )
}

export { Input }
