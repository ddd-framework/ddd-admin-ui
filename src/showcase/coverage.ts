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
      ConfirmDialogView: 'drawn by every package confirmation (the confirm hook and the confirm dialog hook; the form samples ask through it)',
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
      'ClearFiltersButton', 'FilterCountBadge', 'FilterToggleButton',
    ],
    notShown: { EntityListPage: 'deprecated re-export; shown under ./page' },
  },
  page: {
    shown: [
      'AddEntityButton', 'AnchorLink', 'CardGrid', 'DefinitionList', 'DetailHeader', 'EditableCard', 'EntityDetailShell',
      'EntityListPage', 'EntityMetadata', 'EntityTabs', 'ExportButton', 'IconValue', 'IconValueRow', 'MoreActionsMenu',
      'MaintenanceActionCard', 'PageFrame', 'PageHeader', 'PageSections', 'PageToolbar', 'SectionHeader', 'StatusCallout',
      'StatusCalloutAction', 'RouteError', 'RouteLoading',
    ],
    notShown: {},
  },
  form: {
    shown: [
      'DrawerFooter', 'Form', 'FormActions', 'FormDialog', 'FormDrawer', 'FormErrors', 'FormField', 'FormFieldFrame', 'FormHeader',
      'FormJumpBar', 'FormSection', 'FormSubmitButton', 'FormWrapper', 'VisibleWhen',
      'ColorValueField',
    ],
    notShown: {
      UnsavedChangesContext: 'a context (used by FormDrawer)',
      ConfirmDialogView: 'drawn by every package confirmation (the confirm hook and the confirm dialog hook; the form samples ask through it)',
    },
  },
  translations: {
    shown: [
      'AppTranslationsScreen', 'BackgroundTranslationControls', 'ConfigImportCard', 'FormTranslatableInput',
      'FormTranslatableMarkdown', 'LanguagesScreen', 'LocalesScreen', 'TranslatableField', 'TranslatableInput',
      'TranslatableLanguageInput', 'TranslatableMarkdown', 'TranslationCompleteness', 'TranslationControls',
    ],
    notShown: {
      AppTranslationKeyDrawer: 'drawn by AppTranslationsScreen when a row or Add opens it',
      GenerationEstimate: 'drawn in the confirmation before a generation (TranslationCompleteness, AppTranslationsScreen renderGenerationEstimate)',
      TranslatableLanguageMarkdown: 'TranslatableLanguageInput with the markdown editor of TranslatableMarkdown',
    },
  },
  workers: {
    shown: [
      'ChartBody', 'ChartLegend', 'WorkerChartCard', 'WorkerKpiTiles', 'WorkerLoopsCard', 'WorkerMessageClassesTable',
      'WorkerMessageRunsTab', 'WorkerProcessRange', 'WorkerProcessTimeline', 'WorkerProcessesTab', 'WorkerProcessesTable',
      'WorkerRestartButton', 'WorkerSparkline', 'WorkerTimeChart', 'WorkerTransportCharts', 'WorkerTransportScreen',
      'WorkerTransportsTable', 'WorkersHistoryCharts', 'WorkersLivePanel', 'WorkersOverviewScreen', 'WorkersThroughputTable',
      'WorkersWindowSwitch',
    ],
    notShown: {
      WorkerKpiTilesSkeleton: 'drawn by WorkersOverviewScreen while the overview loads',
      WorkerChartSyncGroup: DRAWN_BY('WorkersHistoryCharts and WorkerTransportCharts'),
      WorkerHint: DRAWN_BY('WorkerTransportsTable, WorkerMessageClassesTable and WorkerProcessTimeline'),
      WorkerTruncatedText: DRAWN_BY('WorkerMessageClassesTable, WorkerProcessesTable and the message runs columns'),
      WorkerTransportFacts: DRAWN_BY('WorkerTransportScreen'),
    },
  },
  issues: {
    shown: [
      'IssueCauses', 'IssueCodeContext', 'IssueDetailBlock', 'IssueEventDetails', 'IssueFrameList', 'IssueGroupFlags',
      'IssueGroupStatusActions', 'IssueWorkerContext', 'IssuesScreen', 'IssuesTrendBars', 'IssuesTrendCard', 'IssuesWindowSwitch',
    ],
    notShown: {
      IssueGroupDrawer: 'drawn by IssuesScreen when a row opens a group',
      IssueEventSummary: 'drawn by IssueEventDetails with summary (IssuesScreen eventSummary)',
      IssuesTrendRangeControl: 'drawn by IssuesScreen with customTrendRange instead of IssuesWindowSwitch',
    },
  },
  database: {
    shown: ['CodeBlock', 'GeneratedCodePanel', 'SchemaDiffCard', 'SchemaDiffScreen'],
    notShown: {},
  },
  clouddrive: {
    shown: ['CloudDriveScreen'],
    notShown: {},
  },
  files: {
    shown: ['FileFamilyIcon', 'FileManager', 'QuotaPill'],
    notShown: {
      FileBreadcrumbs: DRAWN_BY('FileManager'),
      FileCard: DRAWN_BY('FileManager (grid)'),
      FileDndProvider: 'a context provider (mounted by FileManager)',
      FileDrawer: DRAWN_BY('FileManager when a file opens'),
      FileItemActions: DRAWN_BY('FileCard and the table rows of FileManager'),
      FileLinkChips: DRAWN_BY('FileManager with the links capability'),
      FilePreview: DRAWN_BY('FileDrawer'),
      FolderActionsMenu: DRAWN_BY('FolderTree, FolderCard and the folder rows'),
      FolderCard: DRAWN_BY('FileManager (grid)'),
      FolderNameDialog: DRAWN_BY('FileManager (new folder, rename)'),
      FolderTree: DRAWN_BY('FileManager'),
      LinkTargetsDialog: DRAWN_BY('FileManager (edit links)'),
      MoveAcrossAreasDialog: DRAWN_BY('FileManager (move into another area)'),
      MoveDialog: DRAWN_BY('FileManager (move)'),
      PdfPreview: 'drawn by FilePreview with the host\'s pdf.js loader',
      TextPreview: DRAWN_BY('FilePreview (text and CSV)'),
      UploadError: 'an error class (rejections of uploadWithProgress)',
      UploadTray: DRAWN_BY('FileManager while uploads run'),
    },
  },
  crons: {
    shown: [
      'CronActionErrorCallout', 'CronDetailsDrawer', 'CronDurationChart', 'CronExecutionDialog', 'CronFormDrawer', 'CronLastRun',
      'CronNextRun', 'CronRowActions', 'CronRunStrip', 'CronRunnerBanner', 'CronRunsView', 'CronScheduleText',
      'CronSchedulePreview', 'CronSummaryTiles', 'CronTimeline', 'CronTimelineCard', 'CronsScreen', 'CronsTable',
    ],
    notShown: {
      CronTimeDisplayContext: 'a context (set by CronTimeDisplayProvider)',
      CronTimeDisplayProvider: 'mounted by CronsScreen (timeZone); wraps the parts drawn on their own',
    },
  },
  media: {
    shown: ['FormMediaItemField', 'MediaItemField', 'MediaItemPickerDialog', 'MediaPreview', 'ImageCropDialog'],
    notShown: {},
  },
  glass: {
    shown: ['ActionRow', 'CollapsibleCard', 'GlassGroup', 'GlassPill', 'QuickFilterPills'],
    notShown: {},
  },
  data: {
    shown: ['DeltaText', 'MetricGrid', 'MetricTile', 'NoteList'],
    notShown: { MetricTileSkeleton: DRAWN_BY('MetricGrid isLoading') },
  },
  markdown: {
    shown: [],
    notShown: {
      MarkdownEditor: 'drawn by the ./markdown section when the host passes loadMarkdown (optional peers)',
      MarkdownPreview: 'drawn by the ./markdown section when the host passes loadMarkdown (optional peers)',
    },
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
      ShellNavDisplayContext: 'a context (set by AppShell or ShellNavDisplayProvider)',
      ShellNavDisplayProvider: 'the row display of AppShell for parts used without the frame',
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
