"use client"

import * as React from "react"
import { cn } from "./cn.ts"
import { AnchorLink, LinkComponentContext } from "./link.tsx"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { Slot } from "radix-ui"
import { useTranslate } from "../i18n/index.ts"

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  const { t } = useTranslate()
  return <nav aria-label={t("breadcrumb", { context: "navigation" })} data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5",
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  )
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
}) {
  // the host's link component (AdminUiProvider.linkComponent), when one is set: a crumb navigates like every other link
  const HostLink = React.useContext(LinkComponentContext)
  if (!asChild && props.href && HostLink !== AnchorLink) {
    const { href, children, ...rest } = props
    return (
      <Slot.Root
        data-slot="breadcrumb-link"
        className={cn("transition-colors hover:text-foreground", className)}
        {...rest}
      >
        <HostLink href={href}>{children}</HostLink>
      </Slot.Root>
    )
  }

  const Comp = asChild ? Slot.Root : "a"

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { t } = useTranslate()
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">{t("More", { context: "breadcrumb-ellipsis" })}</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
