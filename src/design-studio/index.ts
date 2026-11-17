/**
 * `designStudioComponents`: the `components` value of `@mgamadeus/ddd-design-studio`'s provider, drawn with this
 * package's primitives and blocks. Pass it as is, or spread it and replace single slots:
 * `components={{ ...designStudioComponents, Button: MyButton }}`. Never imports the studio; `contract.ts` holds the
 * structural copy of the studio's slot types the map is checked against.
 */
import { Combobox, SearchField, StatusBadge } from '../list/index.ts';
import { CardGrid, PageHeader, PageSections, StatusCallout } from '../page/index.ts';
import { QuickFilterPills } from '../glass/index.ts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../primitives/index.ts';
import type { DesignStudioComponentsContract } from './contract.ts';

export type * from './contract.ts';

/** Every slot of the studio's `DesignStudioComponents`, mapped to the block of the same name. */
export const designStudioComponents = {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Checkbox,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Combobox,
  SearchField,
  QuickFilterPills,
  StatusBadge,
  PageHeader,
  StatusCallout,
  CardGrid,
  PageSections,
} as const satisfies DesignStudioComponentsContract;
