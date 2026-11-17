/**
 * A structural copy of the component contract of `@mgamadeus/ddd-design-studio` 0.7.x (`DesignStudioComponents` and
 * the prop types it uses, from the studio's `provider/types`). Copied, not imported, so this package neither depends on
 * the studio nor loads it: the studio's props are a subset of the blocks' props, and TypeScript matches structurally,
 * so `designStudioComponents` is assignable to the studio's own type. Keep it in step with the studio version named in
 * the README.
 */
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ComponentType, HTMLAttributes, ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

export type DesignStudioStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'highlight' | 'brand';

export interface DesignStudioWithChildren {
  children?: ReactNode;
}

export interface DesignStudioWithClassName extends DesignStudioWithChildren {
  className?: string;
}

export interface DesignStudioAsChildTriggerProps extends DesignStudioWithChildren {
  asChild?: boolean;
}

export interface DesignStudioOption {
  value: string;
  label: string;
}

export type DesignStudioButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'icon' | 'icon-sm';
};

export type DesignStudioBadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' };

export interface DesignStudioCheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
}

export interface DesignStudioDialogProps extends DesignStudioWithChildren {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DesignStudioDialogContentProps extends DesignStudioWithClassName {
  /** `false`: the dialog draws its own close button. */
  showCloseButton?: boolean;
}

export interface DesignStudioComboboxProps {
  options: readonly DesignStudioOption[];
  /** `''` = nothing picked. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  size?: 'sm';
  /** `pill`: a picker in a bar, without the field's edge. */
  shape?: 'pill';
  className?: string;
  'aria-label'?: string;
}

export interface DesignStudioSearchFieldProps
  extends Pick<InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'aria-label' | 'className'> {
  value: string;
  onChange: (value: string) => void;
  clearable?: boolean;
  size?: 'sm';
}

export interface DesignStudioQuickFilterPillsProps {
  options: readonly DesignStudioOption[];
  /** `''` = all. */
  value: string;
  onChange: (value: string) => void;
  /** A leading pill that clears the filter. */
  allLabel?: string;
  size?: 'sm';
  'aria-label': string;
}

export interface DesignStudioStatusBadgeProps {
  tone: DesignStudioStatusTone;
  label: ReactNode;
  icon?: LucideIcon;
  title?: string;
  className?: string;
}

export interface DesignStudioPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Before the title (an icon). */
  leading?: ReactNode;
}

export interface DesignStudioStatusCalloutProps {
  /** Default: an informational notice. */
  tone?: 'destructive';
  title: ReactNode;
  description?: ReactNode;
  /** Replaces the tone's icon. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * The application's UI primitives (shadcn "new-york" names and behaviour) and page blocks, typed with only the props
 * the studio passes. The studio styles them further with Tailwind classes through `className`.
 */
export interface DesignStudioComponentsContract {
  Button: ComponentType<DesignStudioButtonProps>;
  Badge: ComponentType<DesignStudioBadgeProps>;
  Card: ComponentType<DesignStudioWithClassName>;
  CardHeader: ComponentType<DesignStudioWithClassName>;
  CardTitle: ComponentType<DesignStudioWithClassName>;
  CardContent: ComponentType<DesignStudioWithClassName>;
  Skeleton: ComponentType<{ className?: string }>;
  Checkbox: ComponentType<DesignStudioCheckboxProps>;
  Label: ComponentType<DesignStudioWithClassName & { htmlFor?: string }>;
  Textarea: ComponentType<TextareaHTMLAttributes<HTMLTextAreaElement>>;
  Dialog: ComponentType<DesignStudioDialogProps>;
  DialogContent: ComponentType<DesignStudioDialogContentProps>;
  DialogTitle: ComponentType<DesignStudioWithClassName>;
  DialogDescription: ComponentType<DesignStudioWithClassName>;
  Popover: ComponentType<DesignStudioWithChildren>;
  PopoverTrigger: ComponentType<DesignStudioAsChildTriggerProps>;
  PopoverContent: ComponentType<DesignStudioWithClassName & { align?: 'start' | 'center' | 'end' }>;
  Tooltip: ComponentType<DesignStudioWithChildren>;
  TooltipTrigger: ComponentType<DesignStudioAsChildTriggerProps>;
  TooltipContent: ComponentType<DesignStudioWithClassName & { side?: 'top' | 'right' | 'bottom' | 'left' }>;
  DropdownMenu: ComponentType<DesignStudioWithChildren & { modal?: boolean }>;
  DropdownMenuTrigger: ComponentType<DesignStudioAsChildTriggerProps>;
  DropdownMenuContent: ComponentType<DesignStudioWithChildren & { align?: 'start' | 'center' | 'end' }>;
  DropdownMenuItem: ComponentType<DesignStudioWithChildren & { onSelect?: () => void }>;
  DropdownMenuSeparator: ComponentType<Record<never, never>>;
  /** Single-choice picker with a search field. */
  Combobox: ComponentType<DesignStudioComboboxProps>;
  /** The search box (magnifier inside, clear button while there is text). */
  SearchField: ComponentType<DesignStudioSearchFieldProps>;
  /** A row of filter pills, one picked at most. */
  QuickFilterPills: ComponentType<DesignStudioQuickFilterPillsProps>;
  /** Status pill: tone colour, icon, label. */
  StatusBadge: ComponentType<DesignStudioStatusBadgeProps>;
  /** Title block of a page. */
  PageHeader: ComponentType<DesignStudioPageHeaderProps>;
  /** A notice box (empty state, error). */
  StatusCallout: ComponentType<DesignStudioStatusCalloutProps>;
  /** Cards side by side. */
  CardGrid: ComponentType<{ children: ReactNode }>;
  /** The vertical rhythm between the sections of a page. */
  PageSections: ComponentType<{ children: ReactNode }>;
}

