import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn.ts"

/**
 * One notice box, four tones (the look of `StatusCallout`): no border, `rounded-2xl`, a soft tone fill,
 * the tone ONLY in the fill and the 18 px icon (the first child `svg`); the title in ink, the body muted — never a
 * coloured paragraph. Tones by meaning: `info` (default: read-only notes, heads-ups), `warning` (needs doing before
 * something else works, an irreversible step ahead), `destructive` (broken or blocked now: a failed load or save),
 * `success`. With a title, an optional line and one action: `StatusCallout` (`./page`).
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-2xl px-4 py-3.5 text-sm text-foreground has-[>svg]:grid-cols-[18px_1fr] has-[>svg]:gap-x-3 [&>svg]:size-[18px] [&>svg]:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-info/10 [&>svg]:text-info",
        info: "bg-info/10 [&>svg]:text-info",
        warning: "bg-warning/10 [&>svg]:text-warning",
        destructive: "bg-destructive/10 [&>svg]:text-destructive",
        success: "bg-success/10 [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 min-h-4 leading-5 font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm leading-5 text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
