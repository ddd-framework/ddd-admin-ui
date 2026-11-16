"use client"

import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * shadcn-style `sonner` toaster on the host's tokens (light theme, no theme switching). Render it once at the root next
 * to `AdminUiProvider notifications={sonnerNotifications}`; toasts are raised through `notify`.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-success" />,
        info: <Info className="size-4 text-brand-emphasis" />,
        warning: <TriangleAlert className="size-4 text-warning" />,
        error: <CircleAlert className="size-4 text-destructive" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { description: "!text-muted-foreground" } }}
      {...props}
    />
  )
}

export { Toaster }
