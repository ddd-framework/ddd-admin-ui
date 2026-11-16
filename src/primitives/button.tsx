import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn.ts"
import { Slot } from "radix-ui"
import { FIELD_RADIUS_CLASS, FIELD_SURFACE_CLASS } from "./fieldSurface.ts"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // Neutral hovers, never the yellow accent. No grey-filled `secondary`: it reads as a search
        // or a toolbar menu; a second action is `outline`.
        outline: "border border-input bg-background hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",
        ghost: "hover:bg-tint",
        link: "text-brand-emphasis underline-offset-4 hover:underline",
        // A button that IS a form field (a picker trigger showing its value): the field's surface and edge, text left.
        field: cn(FIELD_SURFACE_CLASS, "justify-start px-3 font-normal"),
      },
      // Before `size`, so the 24 px sizes keep their own smaller corner.
      rounded: {
        // The form field's 12 px corner, icon-only buttons included — no circles by default.
        default: FIELD_RADIUS_CLASS,
        md: "rounded-md",
        lg: "rounded-lg",
        // Only for a control in a bar: the list toolbar's Filters / Clear filters, glass bar buttons.
        full: "rounded-full",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      rounded: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  rounded = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, rounded, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
