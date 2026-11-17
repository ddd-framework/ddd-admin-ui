// ./design-studio: every slot of designStudioComponents renders on the server with the props the design studio passes
// (the overlay slots inside their root, open where the content renders without a portal).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Search } from 'lucide-react';
import { designStudioComponents as C } from '@mgamadeus/ddd-admin-ui/design-studio';
import { TooltipProvider } from '@mgamadeus/ddd-admin-ui/primitives';

const noop = () => {};
const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
const SLOTS = {
  Button: () => h(C.Button, { variant: 'outline', size: 'sm' }, 'Save'),
  Badge: () => h(C.Badge, { variant: 'outline' }, 'Draft'),
  Card: () => h(C.Card, { className: 'x' }, 'Body'),
  CardHeader: () => h(C.CardHeader, null, 'Head'),
  CardTitle: () => h(C.CardTitle, null, 'Title'),
  CardContent: () => h(C.CardContent, null, 'Content'),
  Skeleton: () => h(C.Skeleton, { className: 'h-4' }),
  Checkbox: () => h(C.Checkbox, { id: 'c', checked: true, onCheckedChange: noop }),
  Label: () => h(C.Label, { htmlFor: 'c' }, 'Label'),
  Textarea: () => h(C.Textarea, { value: 'Text', onChange: noop }),
  Dialog: () => h(C.Dialog, { open: false, onOpenChange: noop }, 'Dialog root'),
  DialogContent: () => h(C.Dialog, { open: false }, h(C.DialogContent, { showCloseButton: false }, 'Content')),
  DialogTitle: () => h(C.Dialog, { open: false }, h(C.DialogTitle, null, 'Title')),
  DialogDescription: () => h(C.Dialog, { open: false }, h(C.DialogDescription, null, 'Description')),
  Popover: () => h(C.Popover, null, h(C.PopoverTrigger, { asChild: true }, h('button', null, 'Open'))),
  PopoverTrigger: () => h(C.Popover, null, h(C.PopoverTrigger, null, 'Open')),
  PopoverContent: () => h(C.Popover, null, h(C.PopoverContent, { align: 'start' }, 'Content')),
  Tooltip: () => h(C.Tooltip, null, h(C.TooltipTrigger, { asChild: true }, h('button', null, 'Hover'))),
  TooltipTrigger: () => h(C.Tooltip, null, h(C.TooltipTrigger, null, 'Hover')),
  TooltipContent: () => h(C.Tooltip, null, h(C.TooltipContent, { side: 'top' }, 'Tip')),
  DropdownMenu: () => h(C.DropdownMenu, { modal: false }, h(C.DropdownMenuTrigger, { asChild: true }, h('button', null, 'Menu'))),
  DropdownMenuTrigger: () => h(C.DropdownMenu, null, h(C.DropdownMenuTrigger, null, 'Menu')),
  DropdownMenuContent: () => h(C.DropdownMenu, null, h(C.DropdownMenuContent, { align: 'end' }, 'Items')),
  DropdownMenuItem: () => h(C.DropdownMenu, null, h(C.DropdownMenuContent, null, h(C.DropdownMenuItem, { onSelect: noop }, 'Item'))),
  DropdownMenuSeparator: () => h(C.DropdownMenu, null, h(C.DropdownMenuContent, null, h(C.DropdownMenuSeparator))),
  Combobox: () => h(C.Combobox, { options, value: 'a', onChange: noop, size: 'sm', shape: 'pill', 'aria-label': 'Pick' }),
  SearchField: () => h(C.SearchField, { value: 'q', onChange: noop, clearable: true, size: 'sm', placeholder: 'Search' }),
  QuickFilterPills: () => h(C.QuickFilterPills, { options, value: '', onChange: noop, allLabel: 'All', size: 'sm', 'aria-label': 'Status' }),
  StatusBadge: () => h(C.StatusBadge, { tone: 'success', label: 'Approved', icon: Search, title: 'Hint' }),
  PageHeader: () => h(C.PageHeader, { title: 'Designs', description: 'All projects', leading: h(Search) }),
  StatusCallout: () => h(C.StatusCallout, { tone: 'destructive', title: 'Failed', description: 'Try again' }),
  CardGrid: () => h(C.CardGrid, null, h('div', null, 'One')),
  PageSections: () => h(C.PageSections, null, h('section', null, 'One')),
};

let failed = false;
const missing = Object.keys(C).filter((slot) => !(slot in SLOTS));
if (missing.length > 0) {
  console.error(`FAILED  slots without a render: ${missing.join(', ')}`);
  failed = true;
}
for (const [slot, render] of Object.entries(SLOTS)) {
  try {
    renderToStaticMarkup(h(TooltipProvider, null, render()));
    console.log(`ok      ${slot}`);
  } catch (error) {
    console.error(`FAILED  ${slot}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}
const visible = renderToStaticMarkup(h(TooltipProvider, null, SLOTS.StatusBadge(), SLOTS.PageHeader(), SLOTS.StatusCallout()));
for (const text of ['Approved', 'Designs', 'Failed']) {
  if (!visible.includes(`>${text}<`)) {
    console.error(`FAILED  rendered text ${text} missing`);
    failed = true;
  }
}
if (failed) process.exit(1);
