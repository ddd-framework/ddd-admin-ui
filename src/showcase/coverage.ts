/**
 * Which exported components of each entry the showcase draws (`shown`), and why the others are not drawn on their own
 * (`notShown`: parts drawn by a shown block, providers, contexts). The package's tests compare it with the entries'
 * exports, so a new block without a showcase sample fails them.
 */
export interface ShowcaseEntryCoverage {
  shown: readonly string[];
  notShown: Readonly<Record<string, string>>;
}

const DRAWN_BY = (block: string) => `drawn by ${block}`;

export const SHOWCASE_COVERAGE: Readonly<Record<string, ShowcaseEntryCoverage>> = {
  primitives: {
    shown: [
      'Alert', 'AlertDescription', 'AlertTitle', 'Badge', 'Breadcrumb', 'BreadcrumbEllipsis', 'BreadcrumbItem', 'BreadcrumbLink',
      'BreadcrumbList', 'BreadcrumbPage', 'BreadcrumbSeparator', 'Button', 'Card', 'CardAction', 'CardContent', 'CardDescription',
      'CardFooter', 'CardHeader', 'CardTitle', 'Checkbox', 'Collapsible', 'CollapsibleContent', 'CollapsibleTrigger', 'Command',
      'CommandDialog', 'CommandEmpty', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList', 'CommandSeparator',
      'CommandShortcut', 'Dialog', 'DialogClose', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader',
      'DialogTitle', 'DialogTrigger', 'DropdownMenu', 'DropdownMenuCheckboxItem', 'DropdownMenuContent', 'DropdownMenuGroup',
      'DropdownMenuItem', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuSub', 'DropdownMenuSubContent',
      'DropdownMenuSubTrigger', 'DropdownMenuTrigger', 'FormActionsSlot', 'FormActionsSlotProvider', 'Input', 'Label', 'Popover', 'PopoverAnchor', 'PopoverContent',
      'PopoverDescription', 'PopoverHeader', 'PopoverTitle', 'PopoverTrigger', 'PortalContainerProvider', 'SegmentedControl',
      'Select', 'SelectContent', 'SelectGroup', 'SelectItem', 'SelectLabel', 'SelectSeparator', 'SelectTrigger', 'SelectValue',
      'Separator', 'Sheet', 'SheetClose', 'SheetContent', 'SheetDescription', 'SheetFooter', 'SheetHeader', 'SheetTitle',
      'SheetTrigger', 'Skeleton', 'Switch', 'Table', 'TableBody', 'TableCaption', 'TableCell', 'TableFooter', 'TableHead',
      'TableHeader', 'TableRow', 'Textarea', 'Tooltip', 'TooltipContent', 'TooltipTrigger',
    ],
    notShown: {
      DialogOverlay: DRAWN_BY('DialogContent'),
      DialogPortal: DRAWN_BY('DialogContent'),
      DropdownMenuPortal: DRAWN_BY('DropdownMenuContent'),
      SelectScrollDownButton: DRAWN_BY('SelectContent'),
      SelectScrollUpButton: DRAWN_BY('SelectContent'),
      PortalContainerContext: 'a context (PortalContainerProvider is shown)',
      AnchorLink: 'the default link of every block (drawn by the ./page tabs and back links)',
      LinkComponentContext: 'a context (set by AdminUiProvider.linkComponent)',
      LinkComponentProvider: 'mounted by AdminUiProvider when linkComponent is set',
      PathnameContext: 'a context (set by AdminUiProvider.usePathname)',
      PathnameProvider: 'mounted by AdminUiProvider when usePathname is set',
      TooltipProvider: 'mounted once by AdminUiProvider',
    },
  },
  list: {
    shown: [
      'BooleanCell', 'ChipToggleGroup', 'Combobox', 'CopyButton', 'DateCell', 'EmptyValue', 'EntityListBody', 'EntityListBulkBar',
      'EntityListCard', 'EntityListEmpty', 'EntityListGrid', 'EntityListGridSkeleton', 'EntityListLoadMore', 'EntityListTable',
      'EntityListToolbar', 'EntityListViewToggle', 'FilterDateRange', 'FilterField', 'FilterMultiSelect', 'FilterPanel',
      'FilterSelect', 'FilterText', 'IdCell', 'ImageCell', 'MultiSelect', 'SearchField', 'StatusBadge', 'Tag',
    ],
    notShown: { EntityListPage: 'deprecated re-export; shown under ./page' },
  },
  page: {
    shown: [
      'AddEntityButton', 'AnchorLink', 'CardGrid', 'DefinitionList', 'DetailHeader', 'EditableCard', 'EntityDetailShell',
      'EntityListPage', 'EntityMetadata', 'EntityTabs', 'ExportButton', 'IconValue', 'IconValueRow', 'MoreActionsMenu',
      'PageFrame', 'PageHeader', 'PageSections', 'PageToolbar', 'SectionHeader', 'StatusCallout', 'StatusCalloutAction',
    ],
    notShown: {},
  },
  form: {
    shown: [
      'DrawerFooter', 'Form', 'FormActions', 'FormDialog', 'FormDrawer', 'FormErrors', 'FormField', 'FormFieldFrame', 'FormHeader',
      'FormJumpBar', 'FormSection', 'FormSubmitButton', 'FormWrapper', 'VisibleWhen',
    ],
    notShown: { UnsavedChangesContext: 'a context (used by FormDrawer)' },
  },
  translations: {
    shown: [
      'FormTranslatableInput', 'FormTranslatableMarkdown', 'TranslatableField', 'TranslatableInput', 'TranslatableMarkdown',
      'TranslationControls',
    ],
    notShown: {},
  },
  media: {
    shown: ['FormMediaItemField', 'MediaItemField', 'MediaItemPickerDialog', 'MediaPreview'],
    notShown: {},
  },
  glass: {
    shown: ['ActionRow', 'CollapsibleCard', 'GlassGroup', 'GlassPill', 'QuickFilterPills'],
    notShown: {},
  },
  shell: {
    shown: ['AccountMenu', 'AppShell', 'LanguageMenu', 'LanguageMenuSub', 'ShellBreadcrumbs'],
    notShown: {
      AccountAvatar: DRAWN_BY('AccountMenu'),
      AccountSummary: DRAWN_BY('AccountMenu'),
      LanguageMenuItems: DRAWN_BY('LanguageMenu'),
      MarkedNavIcon: DRAWN_BY('ShellNavRail'),
      NavItemMarks: DRAWN_BY('ShellNavList'),
      ShellDocumentTitle: 'renders nothing (sets document.title); AppShell.documentTitle',
      ShellMenuButton: DRAWN_BY('AppShell'),
      ShellMobileMenu: DRAWN_BY('AppShell'),
      ShellNavLink: DRAWN_BY('ShellNavList'),
      ShellNavList: DRAWN_BY('ShellSidebar'),
      ShellNavRail: DRAWN_BY('ShellSidebar'),
      ShellNavigationContext: 'a context (set by AppShell)',
      ShellNavigationProvider: 'the navigation context of AppShell without the frame',
      ShellSidebar: DRAWN_BY('AppShell'),
      ShellTopBar: DRAWN_BY('AppShell'),
    },
  },
  'shell-background': {
    shown: ['ShaderBackground'],
    notShown: {},
  },
  provider: {
    shown: [],
    notShown: { AdminUiProvider: 'the host mounts it above the showcase' },
  },
  'notify-sonner': {
    shown: [],
    notShown: { Toaster: 'mounted once by the host; the section sends toasts through sonnerNotifications' },
  },
};
