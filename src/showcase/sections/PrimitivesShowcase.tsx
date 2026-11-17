'use client';

import { Bell, ChevronsUpDown, LayoutGrid, List, Map as MapIcon, Settings } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  SegmentedControl,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../primitives/index.ts';
import { PrimitivesAdditionsShowcase } from './PrimitivesAdditionsShowcase.tsx';

/** A labelled sample inside a section. */
export const Sample = ({ title, children }: { title: string; children: ReactNode }) => (
  <div data-showcase-sample={title} className="min-w-0 space-y-2">
    <h3 className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">{title}</h3>
    {/* a specimen wider than the column (a table, a chart, a screen at phone width) scrolls here, never the page; the
        padding keeps focus rings inside the scroll box */}
    <div className="-m-1 flex min-w-0 flex-wrap items-start gap-3 overflow-x-auto p-1">{children}</div>
  </div>
);

/** A grid of samples. */
export const Samples = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">{children}</div>;

const SegmentedSamples = () => {
  const [period, setPeriod] = useState('week');
  const [view, setView] = useState('grid');
  const [scope, setScope] = useState('mine');
  return (
    <>
      <SegmentedControl
        aria-label="Period"
        value={period}
        onValueChange={setPeriod}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week', badge: 3 },
          { value: 'month', label: 'Month', description: 'Calendar month' },
          { value: 'year', label: 'Year', disabled: true, disabledReason: 'Not enough data yet' },
        ]}
      />
      <SegmentedControl
        aria-label="View"
        iconOnly
        height={36}
        selection="primary"
        value={view}
        onValueChange={setView}
        options={[
          { value: 'grid', label: 'Grid view', icon: <LayoutGrid /> },
          { value: 'table', label: 'Table view', icon: <List /> },
          { value: 'map', label: 'Map view', icon: <MapIcon /> },
        ]}
      />
      <div className="w-full max-w-sm">
        <SegmentedControl
          aria-label="Scope"
          fullWidth
          height={40}
          activation="manual"
          value={scope}
          onValueChange={setScope}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'team', label: 'Team' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <div className="rounded-2xl bg-brand p-3">
        <SegmentedControl
          aria-label="Scope on brand"
          tone="onBrand"
          height={48}
          value={scope}
          onValueChange={setScope}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'team', label: 'Team' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
    </>
  );
};

/** The `./primitives` section. */
export const PrimitivesShowcase = () => {
  const [checked, setChecked] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  return (
    <Samples>
      <Sample title="Button">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button variant="field">Field</Button>
        <Button size="sm" rounded="full">
          Small pill
        </Button>
        <Button size="icon" variant="outline" aria-label="Settings">
          <Settings />
        </Button>
        <Button disabled>Disabled</Button>
      </Sample>
      <Sample title="SegmentedControl">
        <SegmentedSamples />
      </Sample>
      <Sample title="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </Sample>
      <Sample title="Alert">
        <Alert>
          <Bell />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Something worth knowing.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>Something went wrong.</AlertDescription>
        </Alert>
      </Sample>
      <Sample title="Card">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>Card content</CardContent>
          <CardFooter>Card footer</CardFooter>
        </Card>
      </Sample>
      <Sample title="Fields">
        <div className="grid w-full max-w-sm gap-3">
          <Label htmlFor="showcase-input">Label</Label>
          <Input id="showcase-input" placeholder="Input" />
          <Input aria-label="Invalid input" aria-invalid defaultValue="Invalid" />
          <Textarea aria-label="Textarea" placeholder="Textarea" />
          <div className="flex items-center gap-2">
            <Checkbox id="showcase-checkbox" checked={checked} onCheckedChange={value => setChecked(value === true)} />
            <Label htmlFor="showcase-checkbox">Checkbox</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="showcase-switch" checked={notifications} onCheckedChange={setNotifications} />
            <Label htmlFor="showcase-switch">Switch</Label>
          </div>
          <Select defaultValue="b">
            <SelectTrigger aria-label="Select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Group</SelectLabel>
                <SelectItem value="a">Alpha</SelectItem>
                <SelectItem value="b">Beta</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="c">Gamma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Sample>
      <Sample title="Overlays">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Dialog description.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet title</SheetTitle>
              <SheetDescription>Sheet description.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverAnchor asChild>
            <span className="inline-flex">
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
            </span>
          </PopoverAnchor>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Popover title</PopoverTitle>
              <PopoverDescription>Popover description.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu label</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>Item</DropdownMenuItem>
              <DropdownMenuCheckboxItem checked>Checked item</DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
        <Button variant="outline" onClick={() => setCommandOpen(true)}>
          Command dialog
        </Button>
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup heading="Group">
              <CommandItem>Alpha</CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </Sample>
      <Sample title="Command">
        <Command className="w-full max-w-sm rounded-xl border">
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                Alpha <CommandShortcut>⌘A</CommandShortcut>
              </CommandItem>
              <CommandItem>Beta</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Other">
              <CommandItem>Gamma</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Sample>
      <Sample title="Breadcrumb, separator, skeleton, collapsible">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#showcase">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Separator />
        <div className="flex w-full items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <Collapsible className="w-full">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              Collapsible <ChevronsUpDown />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 text-sm">Hidden content.</CollapsibleContent>
        </Collapsible>
      </Sample>
      <Sample title="Table">
        <Table>
          <TableCaption>Table caption</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alpha</TableCell>
              <TableCell className="text-right">12</TableCell>
            </TableRow>
            <TableRow data-state="selected">
              <TableCell>Beta (selected)</TableCell>
              <TableCell className="text-right">30</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right">42</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Sample>
      <PrimitivesAdditionsShowcase />
    </Samples>
  );
};
