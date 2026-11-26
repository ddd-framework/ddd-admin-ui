# Changelog

All notable changes to `@mgamadeus/ddd-admin-ui`. 0.x: each minor may break; pin the exact version while the package
is in 0.x.

## 0.9.0

- **A screen filter names the values it takes** (`./agent-ui`, `@mgamadeus/ddd-agents` with filter values).
  `filtersByTargetKey` takes, beside a key, `{ key, values, multiple, hint, tabs }` (`ScreenFilterDeclaration`,
  `ScreenFiltersByTargetKey`; `ScreenTargetFilter` of the contract copy gains the four fields): the stored values of an
  enumeration or a sort, a comma list of them, what a free value is, and the tabs of a record screen whose list the
  filter belongs to. `describeScreenFilters` (the read's `Filters` line) names them:
  `status=OPEN (one of OPEN|SOLVED) · from (date YYYY-MM-DD) · sort (one of id|created, each with :asc or :desc)`.
  The navigator's `currentTarget()` returns the open screen with the filters of its open tab only
  (`matchOpenScreenTarget`, `screenTargetFiltersOfTab`), and `buildScreenTargetHref` sets a filter of a tab with that
  tab only. A filter declared by its key alone behaves as before.

- **Declared actions for an agent that acts on the screen** (`actOnScreen` of `Agent.UI`, `@mgamadeus/ddd-agents` with
  the screen actions). The package's blocks declare what an agent's client may act on, by attribute, never by
  selector: the sort button of every column with a `sortKey` (`data-agent-action="sort"`,
  `data-agent-action-key="<sortKey>"`), table rows and grid cards with a `rowAction` (`data-agent-action="open"`), every
  tab of `EntityTabs` (`data-agent-action="tab"`, key = the tab id), `FilterToggleButton` and `ClearFiltersButton`
  (`press`, effect `view`). A host declares its own buttons with `agentPressProps(key, effect)` (`./agent-ui`,
  `./logic/pure`); the effect defaults to `write`, which the agent's client refuses. **Rows and cards with a
  `rowAction`, sort buttons, `EntityTabs` tabs and the two filter buttons carry new `data-*` attributes** (a host
  snapshot of their markup changes; nothing else does).
- `./agent-ui`: `useAdminUiAgentScreen` returns `actorOptions` (for the agents package's `DomScreenActor`), its
  navigator answers `currentTarget()` and `applyFilters(target, filters)` (changes only the named filter keys of the
  current URL), and `readerOptions.describeFilters` names the open screen's filters and
  their URL values. Pure: `buildScreenFiltersHref`, `describeScreenFilters`. The contract copy gains the two optional
  navigator methods; hosts on an agents package without screen actions are unaffected (the reader ignores the unknown
  option, nobody calls the methods).

## 0.8.2

- Lists in grid view no longer make the page scroll sideways in a window narrower than `lg` (1024 px). The grid pulled
  itself 2rem out of its list card on both sides at every width, while the page inset (`PAGE_INSET_CLASS`) is 1rem
  below `sm` and 1.5rem below `lg`: the grid reached 16 px (8 px from `sm`) past the window's edge. The pull is now the
  page inset of each breakpoint (1rem, 1.5rem from `sm`, 2rem from `lg`); from `lg` nothing changes. A unit test holds
  the stylesheet and `PAGE_INSET_CLASS` together.

## 0.8.1

- `./files`: an SVG is shown as a picture when the server sanitised a copy of it (`FileView.hasSanitizedImage`, kind
  `sanitized-image`, `getDownload` variant `SANITIZED_IMAGE`): an `<img>` with the picture zoom in the drawer and the
  viewer, never the uploaded bytes, never markup, an `<object>` or a frame. An adapter answers `state: 'failed'` when
  it has no sanitised copy to serve; the file then has no preview, as before. `ImagePreview scalable` (a vector
  picture fills its box while fitted, and its zoom counts from that fitted size: 100 % = fitted, a click = 200 %);
  `filePreviewVariantOf`, `filePreviewDispositionOf`, `imageBaseSizeOf`, `fittedImageScaleOf`, `imageZoomBaseOf`. **`FilePreviewKind` gains `sanitized-image`** (a host that switches over the kinds adds it).

## 0.8.0

- `./files`: the preview shows more. Markdown has "Preview" and "Source" (`MarkdownFilePreview`; the markup comes from
  the host's `renderMarkdown`, without it the source alone), source files (JSON, YAML, TypeScript, PHP, SQL, …) are
  coloured by a highlighter the host loads on the first one (`loadCodeHighlighter`, `codeHighlighterFromHighlightJs`;
  the highlighter's output is read as tokens and drawn as text nodes), pictures zoom in steps (`ImagePreview`), MP4 /
  WebM / MOV and MP3 / WAV / OGG … play in the browser's own player (`MediaPreview`). `FilePreviewKind` gains
  `markdown`, `code`, `video`, `audio` (**a `.md` file was `text`, `.json` / `.xml` / `.yaml` were `text`**: now
  `markdown` and `code`); `codeLanguageOfExtension`, `isTextPreviewKind`. `FileManager`, `FileDrawer` and
  `FilePreview` take the loaders `loadCodeHighlighter` and `renderMarkdown` beside `loadPdfJs` (`FilePreviewLoaders`);
  all optional, so a host that passes none keeps text previews.
- `./files`: `FilePreview layout="canvas"` fills the flex column it is put in instead of drawing boxes of a fixed height
  (PDF pages up to `PDF_PREVIEW_CANVAS_MAX_WIDTH`, texts up to `TEXT_VIEWER_BYTES` = 1 MB); `versionId` previews a
  stored version. New block `FileViewer`: one file on a wide surface (name, facts, preview, version choice, download)
  through the file manager's adapter. `PdfPreview` takes `maxWidth`, `TextPreview` `layout` and `maxBytes`;
  `useTextHead` / `readTextHead`, `startFileDownload`.
- `./markdown`: `MarkdownPreview untrusted` for a text of unknown origin (an uploaded file): raw HTML stays text,
  pictures are not loaded (`[image: …]`), no element that loads a resource survives the sanitiser, links keep
  `http(s):` / `mailto:` and open in a new tab without opener and referrer. Pure parts: `remarkUntrustedContent`,
  `restrictMarkdownSanitizeSchema`, `rehypeOutsideLinks`, `untrustedMarkdownUrl`; `MarkdownLibrary.untrusted`.
- `./files`: a text file is edited in place. `FileViewer canWrite` offers "Edit" for Markdown, TXT, CSV and source
  files up to 1 MB when the adapter has the new actions `saveText` and `saveTextAsCopy` (with capability `versions`;
  `features.editText`): a plain text field (`FileTextEditor`), Save writes a new version on top of the version the
  edit started from (`FileTextSaveInput.baseVersionId`). The adapter answers `conflict` when the file has a newer
  version; then nothing is overwritten — the reader keeps editing, loads the newer version or saves the draft as a
  copy beside the file. Pure rules `fileTextEditRefusalOf`, `fileTextDraftSourceOf`, `fileTextForSaving`,
  `copyFileNameOf`; `FileViewer` gains `leading`, `canWrite`, `writesAllowed`, `onTextSaved`, `onTextCopySaved` and
  shows the state of a newer version that waits for its check.
- `./files`: `FileManager variant="compact"` for a narrow surface that gives the height (a canvas beside a chat): no
  folder tree and no quota, a file opens in place in `FileViewer` with a way back, every action by the same rights as
  on the page; `initialState` says where a manager without URL adapters starts. Its table leaves out the columns
  Type, Links, Uploaded by and the dates, so the name, the status, the size and the row's actions fit.
  A file is renamed from its row (`FileNameDialog`, `FileItemHandlers.onRename`), since there is no details drawer;
  the write actions of a row are left out, not drawn switched off, for a viewer without the write right
  (`FileItemActions hidesUnavailable`, also on `FileCard`; the page and embedded variants keep their look).
- `./files`: the preview draws a PDF the server renders of a document (`FileView.hasPdfRendition`, kind
  `pdf-rendition`, `getDownload` variant `PDF_RENDITION`); `FileDownloadView.state` (`pending` → asked again every
  3 s, `failed` → "No preview could be made …") and `message`.
- Fixed: the preview (drawer and viewer) kept showing the content before when a new version passed its check and
  became current while the file was open (an upload, an edit); it now fetches again at that moment.
- Fixed: `CodeText` kept the colours of the text before when a new text had the same length and the same first 64
  characters (now the whole text decides).
- 44 new UI texts, 1 reworded ("This media format has no player here. …").

## 0.7.2

- `./files`: the file activity translates the audience of an access ("· Staff", "· Partner"), what it opened
  ("Preview", "Original") and the event types marked with a context ("Viewed", "Moved", …) in every locale, on the
  changes and the accesses tab. The drawer looked these texts up without their context, so the key
  `Staff__file-access-audience` of the manifest never matched. New pure helpers `translateFileEventType`,
  `translateFileAccessAudience`, `translateFileAccessVariant` (for a host's own `formatEventType`); `FILE_EVENT_LABELS`
  keeps its shape and export.

## 0.7.1

- `./agent-ui`: a mark of the agent no longer lands behind the compact agent window. `useAdminUiAgentScreen` returns
  `highlighterOptions` for `DomScreenHighlighter` of `@mgamadeus/ddd-agents/ui` ≥ 0.3.2 (`getOccludingRect`,
  `onHighlight`): the highlighter scrolls the marked element into the band the window leaves free. The window is the
  first element with `data-agent-panel` (`AGENT_PANEL_ATTRIBUTE`), or what the new option `findAgentPanel` returns;
  the new option `onHighlight` receives each mark (`coveredAfterScroll` when the element stays covered) so the host
  can make the window smaller or move it. Pure helper `findOccludingRectOfAgentPanel`; contract types
  `ScreenOccludingRect`, `ScreenHighlightEvent`. Additive: without `data-agent-panel` and the spread options nothing
  changes.

## 0.7.0

- Removed: the entry `./sandbox`. The sandbox administration left `mgamadeus/ddd-agents` (0.3.0) for
  `mgamadeus/ddd-agent-sandbox`; its screens are the npm package `@mgamadeus/ddd-agent-sandbox`: import
  `createSandboxesApi` and the payload types from `@mgamadeus/ddd-agent-sandbox`, and `SandboxesScreen`,
  `SandboxDetailScreen`, `useSandboxActions`, `SandboxFilePreview` from `@mgamadeus/ddd-agent-sandbox/screen`. Its texts
  travel with it (its own `i18n-keys.json`). The showcase drops its sandbox section and `showcaseSandboxesData`.
- New entry `./agent-ui`: the adapters of `Agent.UI` (`@mgamadeus/ddd-agents/ui` ≥ 0.3.0) for screens built from the
  package. `useAdminUiAgentScreen({ navigation, canAccess, navigate, filtersByTargetKey, viewsByTargetKey,
  ignoreOverlayKinds, findRoot, onOpened })` returns `targets` (`ScreenTargetSource` from the shell's navigation tree,
  rights applied), `navigator` (`ScreenNavigator` over the host's router: refuses with `UNSAVED_CHANGES` or
  `DIALOG_OPEN` from the navigation guard, waits until the opened screen settled), `isVisible`, `readerOptions` (for
  `DomScreenReader`) and `uiStateSource` (`AgentUIState`: route path and parameters, tab, view, unsaved and invalid
  field references `f.<name>`, open overlay kind, visibility). Pure helpers: `buildScreenTargets`,
  `matchScreenTarget`, `buildScreenTargetHref`, `buildAgentUIState`, `describeNavigationBlocker`,
  `describeUnsavedChanges`, `fieldReferenceOf`. The entry never imports the agents package (structural copy of its
  contracts); no new peer.

## 0.6.0

- Removed: the entry `./clouddrive`. The drive screen of `mgamadeus/ddd-clouddrive` is now the npm package
  `@mgamadeus/ddd-clouddrive`, released with the Composer module: import `createCloudDriveApi` and the payload types
  from `@mgamadeus/ddd-clouddrive`, and `CloudDriveScreen`, `CloudDriveSpacePicker`, `useCloudDriveFileAdapter`, the
  file actions and the mapping helpers from `@mgamadeus/ddd-clouddrive/screen` (unchanged API). The showcase drops its
  drive section and `showcaseCloudDriveData`. `./files` stays the generic file manager.

## 0.5.5

Who created a folder, the on-behalf account in the list, and trashed folders in the trash; additive.

- The table's "Uploaded by" column and the grid card add "(on behalf: …)" like the drawer
  (`personWithOnBehalfOf(name, onBehalfOf, t)` in `./files`).
- New optional `FolderView.createdBy`, `createdOnBehalfOf`, `createdAt`, `updatedAt`; the drive adapter fills them
  from `createdByName` / `createdOnBehalfOfName`. The table shows them in "Uploaded by", "Created", "Updated"; the
  folder card shows "Created by %user%" (new key).
- Trash: a trashed folder (empty or not) is a row of its own. New optional `FileView.isFolder` (trash only): folder
  icon and type, no size, status, details or download; restore and delete permanently take its id. The drive adapter
  kept only files of `GET …/trash` and dropped trashed folders; it now keeps them.

## 0.5.4

The uploader's and the version author's on-behalf account (impersonation) next to the name; additive.

- New optional `FileView.uploadedOnBehalfOf` and `FileVersionView.uploadedOnBehalfOf`. The drawer shows them next to
  the name in "Uploaded by" and in each version line, with the activity's own text "(on behalf: %name%)" (no new key:
  a host's existing translation applies).
- The drive adapter maps `DriveNodeListItem.createdOnBehalfOfName` and `DriveFileVersionListItem.onBehalfOfName`
  (ddd-clouddrive ≥ 0.1.0-rc.20); older servers leave them empty.

## 0.5.3

Two fixes of `./files` from a host's second browser check; additive.

- The folder bar (crumbs, path bar, quota) really sticks below the host's top bar: it moved out of the header block (a
  parent only as tall as the bar, so it had nothing to stick against) into the wrapper of the list. Checked in a
  headless browser at 1280×520, embedded and in the page frame (`test/consumer/fixtures/next-app/browser-files.mjs`).
- The open drawer follows a version that is still being uploaded or checked: it fetches the file and its versions again
  every 4 s (`FILE_CHECK_POLL_INTERVAL_MS`), and on window focus, until the check ends; a hidden tab does not poll. When
  the check ends, the list fetches its rows again. New: `FileManagerAdapter.useFile(fileId, options?)` with
  `FileQueryOptions.pollingIntervalMs`, optional `refetch` on `FileQueryState` and `FileListState`,
  `isFileBeingChecked()`. The drive adapter maps the interval to RTK Query's `pollingInterval`. An adapter that ignores
  the option keeps working (no polling).

## 0.5.2

Fixes of `./files` and `./clouddrive` from a full browser check of a host; additive.

- The path bar shows why a location was not found: the field stays focused (read-only, not disabled) while the
  location resolves, so the blur no longer closed the bar before the error arrived.
- The folder bar (crumbs, path bar, quota) sticks below the host's fixed top bar (`top-[var(--nav-h)]`) instead of
  under it.
- A restore shows the restored content at once: `FileView.contentVersion` (new, optional; the drive sets the current
  version's number) is part of the preview's key, so another current version fetches the preview again.
- A file in the trash shows a note instead of a preview and asks for no preview URL (the drive releases trashed content
  as a download only).
- A closed drawer holds no queries of its file (it keeps drawing the last file while it slides out), so a file trashed
  or purged afterwards is not fetched again.
- An explicit empty URL parameter wins over the saved list state (`useUrlListState`): `?tab=&folder=` opens the files,
  not the trash or the last folder. The saved state comes back only when the URL carries none of the list's keys.
- The drawer takes a file's trash state from the file (`deletedAt`) when the adapter reports it: a live file opened
  with `tab=trash` is shown live.
- A jump to another space (`drive/<id>`, a mount path) asks only that space's folders: the drive adapter never uses the
  previous space's root or folder tree while the new one loads.
- File and folder cards carry `data-row-key` (no `EntityListGrid` warning).
- Version notes the system wrote are drawn in the reader's language: `FileVersionView.systemNote` (new:
  `RESTORED_FROM_VERSION`, `MOVED_FROM_AREA`, `COPIED_FROM_PATH`), mapped from the drive's `commentCode` /
  `commentParameters` (ddd-clouddrive ≥ 0.1.0-rc.19); no internal ids, the source area and path only when the server
  sends them. Free text stays `comment`.

## 0.5.1

Fixes of `./sandbox` from the first host integration; additive elsewhere.

- Status badges translate: `SANDBOX_STATE` and `SANDBOX_ACTION_OUTCOME` carry their translation context on the map
  (`Offloaded`, `Idle` … were shown in English although the host had translated them).
- Tab and section names translate: `EntityTab.context` (new, optional) and `EntityListCard.labelContext` (new, optional)
  pass the context of a marked label; the sandbox tabs and list cards use them.
- Commands show their state: `AgentSandboxCommand.status` (`RUNNING` / `EXITED` / `KILLED` / `TIMED_OUT`, ddd-agents
  ≥ 0.1.34) as a badge (`SANDBOX_COMMAND_STATE`, `sandboxCommandStateOf`); the exit code next to EXITED. Without a
  status: an exit code is EXITED, none is "state unknown" — a killed or timed-out command is never shown as running.
- The audit names a killed job as one text, `Kill job %id%` (context `sandbox-action`).
- File content resolves to the shared download shape `{ blob, filename, contentType, isTruncated }`
  (`readSandboxFileContent`, `fileNameOfContentDisposition`), so a store that ignores `payload.blob` needs no other
  rule. **Breaking for direct callers** of `useSandboxFileContentMutation`: read `.blob` instead of the bare `Blob`.

## 0.5.0

New entry `./sandbox` for mgamadeus/ddd-agents 0.1.32 (`AgentSandboxesControllerTrait`). Additive for every other
entry.

- `./sandbox`: `createSandboxesApi({ baseApi, apiPrefix })` (+ `createStaticSandboxesApi`), `SandboxesScreen` (every
  workspace: state, last activity, disk and memory against their limits with the peak, mount mode and its reason,
  runner, owner, conversations, a running-turn marker; start / warm up, offload, end per row; "not set up" without a
  host administration) and `SandboxDetailScreen` (facts, then the tabs Files — read only, the safe preview —, Unsaved
  changes, Processes & jobs with kill, Commands with exit code, duration and output tails, Conversations with
  `buildConversationHref`, Session log, Audit). `useSandboxActions`: confirmations, reset with the typed name, a reason
  and `force` while a turn runs (also on the server's 409). Everything from the sandbox is escaped text; file previews
  only for JPEG / PNG / GIF / WebP (`<img>`), PDF (host pdf.js) and plain text.
- `./logic`: `InjectedRequest.responseHandler` takes a function (raw bytes for a mutation).
- `./showcase`: the `sandbox` section, `showcaseSandboxesData`.

## 0.4.4

The release of 0.4.3 (its tag was never published: the text manifest carried the old version). Same content as
0.4.3 below.

## 0.4.3

For mgamadeus/ddd-clouddrive 0.1.0-rc.14 (rc.10 – rc.13 keep working; the path bar's `drive/<id>` and the accesses need
rc.14 / rc.11).

- `./files`: the location lives in the URL. `folder` holds a path (`/Templates/Typst`; a folder id still works), the
  trash is `tab=trash` (an old `folder=trash` still opens it), the drawer's activity tab `fileTab=accesses`;
  `urlKeys` renames every key for the host. Area, folder and tab changes are history entries (Back / Forward step
  through folders); search, filters, sort and view replace. A path that names no folder shows the nearest one with a
  notice; a file's path opens its folder and details.
- `./files`: sticky breadcrumbs with a menu of the folders beside each crumb; the path bar (last crumb, its pencil or
  Ctrl/Cmd+L): `/a/b`, `drive/<id>`, `/workspace/drive/…`, `drivespaces/<mount>/…`, folder-name completion, a clear miss
  (`FilePathBar`, pure helpers in `filePaths.ts`). "Copy path" and "Copy link" on every file and folder, in the drawer
  too (`FileCopyMenu`, `buildLink`). `FolderTreeActions` writes are optional (readers get the copy entries).
- `./files`: capabilities `location.resolveLocation` (paths the tree cannot resolve), `activity.useAccessEvents` (a
  Changes / Accesses switch in the drawer: viewed, downloaded, staff or partner, preview or original, the address when
  given) and `audience: 'partner'` (no purge, empty trash, area settings or maintenance). `readOnlyNotice`.
  `FileDownloadOptions.variant` adds `THUMBNAIL`.
- `./clouddrive`: `space`, `path`, `file`, `fileTab`, `tab`, `view`, `q`, filters and `sort` in the URL
  (`CLOUD_DRIVE_URL_KEYS`; the screen no longer keeps the space in component state); `?node=<id>` opens a node by id
  (`CLOUD_DRIVE_NODE_KEY`). The path bar resolves through `GET /spaces/{id}/resolve` (`useResolveDriveLocationMutation`,
  `driveLocationResolutionOf`, `driveLocationMissOf`) and switches space. `createCloudDriveApi({ audience: 'shared' })`
  for a partner mount. Events ask `eventGroup=changes`, the accesses `eventGroup=accesses`; a preview asks
  `purpose=INLINE`, a download `DOWNLOAD` (`drivePurposeOf`), list pictures stay the server's thumbnail URLs (never
  recorded).
- `./clouddrive`: the picker's heading is `groupLabel` (translated); `displayGroup` (an ordering code) is shown only
  without a label.
- `./logic`: `UrlStateAdapter.push` (optional), `useUrlListState({ pushKeys })`, `renameUrlStateKeys`;
  `useNextUrlStateAdapter` and `useMemoryUrlState` implement `push`.

## 0.4.2

For mgamadeus/ddd-clouddrive 0.1.0-rc.12 (older servers keep working).

- `./files`: scan status `BLOCKED` (refused by the area's type rules, not malware) beside `INFECTED`; the newest version's
  state adds `infected` (`blocked` now means the type rules) and shows `newestVersionNumber` and `newestVersionReason`
  in the drawer.
- `./clouddrive`: the picker groups by `displayGroup` (else `groupLabel`) in the server's order; the quota is
  `quota.effectiveQuotaBytes` (else `quotaBytes`, `effectiveQuotaOf`); a file's newest version maps
  `latestVersionNumber`, `latestVersionScanStatus` and `latestVersionStateReason`; `BLOCKED` maps to the file status.

## 0.4.1

Additive.

- `./clouddrive`: the space picker keeps the server's order (group, then name) and shows a second line per space (file
  count · used size; `CloudDriveSpacePicker spaces`); `groupDriveSpaces` moved to the pure mappers. The storage pill's
  tooltip lists the usage split when the server sends it (`quota.currentVersionBytes`, `olderVersionBytes`,
  `trashedBytes`, `pendingBytes`; `driveUsagePartsOf`). A file whose newest version is not current shows its state
  from `latestVersionScanStatus` when the item carries it (being checked, check failed, blocked). A folder's count is
  its entries (`1 entry` / `5 entries`): the drive counts files and folders.
- `./files`: `FileView.newestVersionStatus` + `newestVersionStateOf` + `FILE_NEWEST_VERSION_STATE` (table, card and
  drawer name a failed or blocked new version instead of "being checked"); `FolderView.entryCount` +
  `folderContentLabel`; `FileAreaView.usageParts` and `QuotaPill parts` (tooltip lines).

## 0.4.0

Breaking for `./clouddrive`: the screen needs mgamadeus/ddd-clouddrive ≥ 0.1.0-rc.10.

- New entry `./files`: a generic file manager on the host's API. `FileManager` with a `FileManagerAdapter` (opaque area
  keys and ids) and optional capabilities — `trash`, `versions` (replace, restore an older version, delete older),
  `activity`, `links` (host-defined target kinds, link dialog, linked / not linked filters, link tabs),
  `moveAcrossAreas` (area picker, drops on other areas, confirmation from the move preview), `filters`, `workingCopy`,
  `malwareScan`; slots `headerActions`, `renderAreaSettings`, `renderAreaMaintenance`, `renderAreaPicker`,
  `formatEventType`. Folder tree, grid and table, search and filters in the URL state, upload tray with progress
  (`useFileUploadQueue`, `uploadWithProgress`, `precheckUpload`), drag and drop on the browser's own events, details
  drawer with preview (raster images, PDF through the host's pdf.js, text; SVG and HTML never rendered), facts, links,
  versions and activity, the trash. `createStaticFileManagerAdapter` and `showcaseFilesData` for reviews and tests.
- `./clouddrive` rebuilt on `./files`: `CloudDriveScreen` is the file manager on the drive with a grouped, searchable
  space picker (`CloudDriveSpacePicker`, `displayName` / `groupLabel` of the server), preview, versions with restore,
  history, malware status, the agents' unsaved changes, filters (type, created, mine) and orders (name, created, size),
  the trash with restore, and purge / empty trash for viewers with the space's manage right. New:
  `useCloudDriveFileAdapter` / `createCloudDriveFileAdapter`, `buildCloudDriveFileActions`, the mappers
  (`driveFileViewOf`, `driveFolderViewsOf`, `driveChildrenArgOf`, `emptyDriveTrashFully`, …), and the operations of
  rc.10 on `createCloudDriveApi` (`useDriveSpaceQuery`, `useDriveTrashQuery`, `useDriveFoldersQuery`,
  `useDriveVersionsQuery`, `useDriveEventsQuery`, `useRestoreDriveVersionMutation`, `useUpdateDriveNodeMetadataMutation`,
  the space-scoped bulk `useMoveDriveNodesMutation`, `useTrashDriveNodesMutation`, `useRestoreDriveNodesMutation`,
  `usePurgeDriveNodesMutation`, `useEmptyDriveTrashMutation`; children and search take the list filters).
  `CloudDriveScreen` props: `api`, `title`, `initialSpaceId`, `initialFolderNodeId`, `initialNodeId` and
  `headerActions` stay; new `description`, `urlStateAdapter`, `drawerUrlAdapter`, `loadPdfJs`, `renderAreaMaintenance`,
  `renderAreaSettings`, `formatEventType`, `defaultView`, `variant`. `sendDriveUpload` takes an optional `AbortSignal`. Text and
  PDF previews fetch the store's download URL from the browser: the bucket's CORS must allow it.

## 0.3.16

The content of 0.3.15 again: the registry accepted the 0.3.15 publish but never listed it.

## 0.3.15

- Fixed: `./clouddrive`'s breadcrumbs render each separator as a sibling of its item (before, an `<li>` inside an
  `<li>` whenever a folder was open: a hydration error).

## 0.3.14

`./clouddrive` fixes from the first host. Additive.

- Deep links: `CloudDriveScreen` takes `initialFolderNodeId` (opens that folder) and `initialNodeId` (opens the
  folder of a file or folder and selects its row, scrolled into view). Space and path come from the node's
  `ancestors` (mgamadeus/ddd-clouddrive ≥ 0.1.0-rc.3).
- Write access: upload, new folder, trash and restore follow `WriteAccessProvider` (disabled with its reason).
- Times: offsetless backend times are read as UTC (`parseDriveTime`); before, as local time.
- The space picker is controlled from the first render (no React warning); the size column reads "File size" (its
  own text: "Size" was translated as dimensions).

## 0.3.13

New entry `./clouddrive`: the drive screen on the endpoints of `mgamadeus/ddd-clouddrive` (`CloudDriveControllerTrait`).
Additive.

- `createCloudDriveApi({ baseApi, apiPrefix })` injects the operations (spaces, folder pages, name search, node with
  versions, new folder, upload reserve and complete, content URLs, move, trash, restore, file cards for the
  `DriveFiles` widget); `createStaticCloudDriveApi` answers fixed payloads.
- `CloudDriveScreen`: space picker with usage, breadcrumbs, folders and files (system folders and files pending their
  scan marked), direct upload to the object store (single PUT or multipart, every signed header sent unchanged),
  download through a short-lived URL, new folder, trash with undo, name search.
- `sendDriveUpload(reservation, file, onProgress)` and `formatDriveSize()` for hosts with their own upload UI.

## 0.3.12

Delta saves of translatable texts and controls for translations that run on the server. Everything is additive: the
default save mode stays `'replace'`, so a host that sets nothing new sends the same payloads as on 0.3.11. The list and
form actions snapshots are unchanged. README › "Translatable texts: delta saves and background translation".

The problem: a form's save of a translatable field sent `replaceExistingTranslations: true` with the whole store as it
was loaded, and the server replaced the column. A text a background translation (or another user) stored while the
form was open was deleted by the form's next save.

`./logic`:

- `useEntityTranslations` gains `translationSaveMode` (`'delta' | 'replace'`, default `'replace'`), `getBaseline()`
  (the texts of the last load or save answer), `buildDeltaPayload(texts)` (only the keys changed since the baseline, a
  cleared key as `null`, `replaceExistingTranslations: false`), `hasDelta(texts)`, `buildSavePayload(texts)` (the
  payload of the save mode, `undefined` without a change), `omitScalars(body, keep?)` (delta mode: no plain value of a
  translatable field; a NULL next to merge mode clears the column on MariaDB only), `commit(texts)` and
  `rebase(newerEntity, texts)` (untouched keys take the newer text and move into the baseline, touched keys stay in the
  delta; returns `{ stored, values, hasDelta }`; the newer keys become tabs).
- Pure, also in `./logic/pure`: `buildTranslationDeltaStore`, `buildDeltaTranslationInfos`, `hasTranslationDelta`,
  `rebaseTranslations`, `storedTranslationTexts`, `omitTranslatableScalars`, `rebaseEditedValue`, and the progress of
  a server-side translation: `translationProgressRowsOf` (parts → one row per language: running, pending, failed,
  done), `parseTranslationFailureMessage`, `hasOpenTranslationPart`, `isOpenTranslationPart`, `isOpenTranslationRow`,
  `endedTranslationPartIds`, `translationLanguageCodeOf`, `translationLanguageCodesOf`; types
  `DeltaTranslationInfos`, `TranslationDeltaStore`, `TranslationSaveMode`, `BackgroundTranslationRow`,
  `BackgroundTranslationFailure`, `BackgroundTranslationPart`, `BackgroundTranslationStatus`, `RebasedFormTranslations`.
  `TRANSLATION_INFOS_OBJECT_TYPE` is also exported from `./logic/pure`.

`./translations`:

- `BackgroundTranslationControls`: the translation controls driven by the host's progress rows (`pending`, `running`,
  `done`, `failed` with reason, properties and detail; `failureReasonLabels` for the host's reason codes), no cancel,
  an optional "Dismiss" once nothing runs, "Save and translate" while `isDirty`, `disabledReason` as text. The chips
  carry no native `title` (the locale's name is screen-reader text).
- `TranslationControls` and `BackgroundTranslationControls`: `localeMarkers` (a count per locale key or language, e.g.
  texts whose source changed after the translation) draws a marker with the count on the chip and a summary line;
  `markerLabel`, `markerSummaryLabel` (`null`: no line). `TranslationControls` takes `isDirty` for the "Save and
  translate" label. Without the new props it renders as on 0.3.11.
- `AppTranslationKeyDrawer`: a value row takes a newer stored copy of its value (a background generation, another
  user) for every part the user did not change; it kept the text it was mounted with, and its next save wrote that
  older text over the newer one. The key form keeps the user's changed fields when a newer copy of the key arrives
  (`reset(…, { keepDirtyValues: true })`) instead of discarding them.
- The showcase's bound translatable form uses delta mode; a `BackgroundTranslationControls` sample.

New data attributes (`tokens.json`): `data-translation-status` on a progress row, `data-translation-marker` (the
count) and `data-translation-marker-summary`. New texts with hints in `i18n/hints.json` (`i18n-keys.json` regenerated).

Tests: unit tests of the delta, the rebase, the null / empty / omitted cases on a model of the server's merge mode and
of the progress rows; `options-0312-render.mjs` (server render of the hook and both controls); a browser check
(`app/translation-delta`): a background write while the form is open survives its save, and a reload rebases the form.

## 0.3.11

Fix of the navigation guard of 0.3.10; no API change. The list and form actions snapshots are unchanged.

- `./primitives`: `DialogContent` and `SheetContent` reported themselves as open overlays from the wrapper component,
  which renders while the dialog is closed when a host keeps `<Dialog><DialogContent/></Dialog>` mounted (only Radix's
  inner content unmounts). Every mounted but closed dialog or sheet then counted as open, and `canNavigate()` answered
  `{ allowed: false, reason: 'dialog-open' }` with nothing on screen. The report now comes from an element inside the
  Radix content (`OverlayPresenceMarker`), which exists only while the overlay is open or closing.
- `./list`: in development, `EntityListGrid` warns once per page when cards render but none carries `data-row-key`
  (the card component drops unknown `data-*` props; spread them onto its root or set `data-row-key` from
  `EntityCardProps.rowKey`).
- The consumer test has a browser check of the guard against a dialog and a sheet kept mounted while closed.

## 0.3.10

Stable hooks for a host's tools that read the screen, navigate or highlight elements (an agent embedded in the admin,
an end-to-end test). Everything is additive: a host that sets nothing new renders and behaves as on 0.3.9. The list and
form actions snapshots change by the new data attributes only (`data-row-key` on rows and cards, `data-agent-skip` on
skeletons and the bulk bar). README › "Screen state for agents and tests".

`./list`:

- Every row of `EntityListTable` and every card of `EntityListGrid` (also the phone cards of `EntityListBody`) carries
  `data-row-key="<getRowKey(item)>"`. A card gets it on the element `renderCard` returns (unless it sets its own; a
  fragment or text card gets none); the renderer also receives `rowKey` (`EntityCardProps.rowKey`).
- `onListStateChange(state)` on `EntityListBody`, `EntityListTable`, `EntityListGrid` (`EntityListDataProps`): after
  the first render and after every change, never on the server; the body reports once for its views. `EntityListState`
  `{ view, rowKeys, selectedRowKeys, columnIds, filters, sort, isLoading, hasError }`; `activeFilters` (e.g.
  `list.debounced`) fills `filters` (empty values dropped).

`./logic`:

- `buildEntityListState`, `sameEntityListState`, `useListStateReport(onChange, buildState)` (a host's own view);
  `EntityListState`, `EntityListStateInput`.
- `useUnsavedChangesGuard(isDirty, confirm, options?)`: `UnsavedChangesGuardOptions` `{ formId?, label?, form?, ignore?,
  dirtyFieldNames? }`; with `form` the changed fields are read when asked, compared like `useFormDirty`
  (`dirtyFormFieldNames(values, baseline, ignore?)`, dotted paths).
- `UnsavedChangesRegistry.getDirtyForms?()` (optional on the interface, always present on the package's registry) and
  an optional third argument of `setDirty` (`DirtyFormDetails`); `hasUnsavedChanges()` is unchanged. `DirtyForm`
  `{ formId, label?, dirtyFieldNames }`.
- `useNavigationGuard()` → `{ canNavigate(options?), getDirtyForms(), getOpenOverlays() }`; the same functions outside
  React (`canNavigate`, `getDirtyForms`, `getOpenOverlays`, `subscribeUiActivity`, `decideNavigation`).
  `NavigationDecision` `{ allowed, reason?: 'unsaved-changes' | 'dialog-open', dirtyForms, openOverlays }`: unsaved
  changes refuse first, then an open package overlay; `ignoreOverlayKinds` lets kinds through. The page-wide store
  lives on `globalThis` (`UI_ACTIVITY_KEY`), shared by two copies of the package. Also in `./logic/pure`.

`./form`, `./primitives`, `./shell`:

- `FormDialog isDirty` lists the open dialog in `getDirtyForms()` (title as label when it is text, fields with `form`).
  `CronFormDrawer` and the app translation key drawer pass their form and label to the guard.
- `DialogContent` (kind `dialog`) and `SheetContent` (kind `sheet`) report themselves while mounted; `overlayKind`
  (`OverlayPresenceKind | null`) sets the kind or turns it off; a `forceMount` content never reports. `FormDrawer`
  reports `drawer`; the shell's mobile menu does not report (a navigation closes it).

Attribute convention (listed in `tokens.json` `dataAttributes`): `data-agent-anchor` (set by the host on regions),
`data-agent-secret` (never read the value out), `data-agent-skip` (the subtree is chrome, not content).

- `data-agent-secret`: `Input type="password"`. The package has no other password, key or token field.
- `data-agent-skip`: `Skeleton`, the `EntityListViewToggle` fieldset, the clear button of `SearchField`,
  `EntityListBulkBar`, the ✕ of `FormDrawer`, the sidebar's collapse toggle, `ShellMenuButton`, the `Toaster` region
  (`./notify-sonner`).

Tests: unit tests for the dirty-form listing, the field names, the navigation decision and the list state; the server
render `options-0310-render.mjs` (in `test:render` and the consumer run): row keys on rows and cards, the secret and
skip attributes, no list report on the server, the navigation guard.

## 0.3.9

Optional props for hosts that moved their list table, admin frame and app translations screens onto the package. A
caller that sets none of the new props renders as on 0.3.8, with two exceptions: the default tie-break of
`sort="severity"` on `./crons` (**behaviour change**, see there) and the selection cell of a table with column tracks
(a fix, see `./list`). The list and form actions snapshots are unchanged.

`./list`:

- `EntityListTable` (and `EntityListBody`): `cellPaddingX` (`number | { inner, edge? }`, px): the inline padding of
  every cell instead of 16 px / 24 px at the card edge, through `--list-cell-px` / `--list-cell-edge-px` on the
  table's host; `columnWidthBox="content-box"` tracks add that padding and the selection column's default width follows
  the edge (edge + 16 px). Helpers `resolveListCellPadding`, `listCellPaddingAt`, `LIST_CELL_PADDING` (`./logic`).
  No `columnGap`: a gap between tracks would show the scrolled content between pinned cells.
- `showEmptyState={false}` on the table, the grid and the body: no built-in empty and no-results block (the error and
  the loading announcement stay).
- `sortIconPosition` (`'start' | 'end' | 'auto'`, default `auto`: before the label in an end-aligned column, as
  before; also per column) and `sortButtonClassName`; `isSortIconFirst` (`./logic`).
- `headerRowClassName` (the header `<tr>`), `headerCellClassName` (every cell of the header row: columns, selection,
  row index and the filler alike, e.g. its height), `tableClassName`, `skeletonClassName`.
- `scroll={false}` (table, body, grid): the table, its page-sticky host and the grid sit in the page flow (no
  `md:flex-1 md:min-h-0`, the grid no `md:overflow-y-auto`); the table still scrolls sideways.
- `selectionHitArea="cell"`: the select-all header cell is a target too (a press beside the checkbox selects or clears
  every loaded row).
- Fix, tables with column tracks only: the selection cell is sized by its track (`selectionColumnWidth` now widens the
  cell, not only the track; it kept `w-10`) and the checkbox sits centred (the table-cell `translate-y-[2px]` offset is
  dropped in the grid rows). Content-sized tables are unchanged.
- `pinEdge="overlay"`: the edge reads the optional variables `--list-edge-width`, `--list-edge-color`,
  `--list-edge-shadow-offset`, `--list-edge-shadow-blur`, `--list-edge-shadow-color` and `--list-edge-fade` (a gradient
  from the table's surface to transparent over the scrolled content); unset it draws as before. Listed in `tokens.json`
  (optional).

`./shell`:

- `AppShell contentElement="div"` (pages that bring their own `<main>`); `topBarAttributes`, `sidebarAttributes`
  (`data-*`), `sidebarClassName`; `ShellSidebar` takes `data-*`.
- Navigation rows: `navGroupRowHover="row"` (a group with its own page tints as one row instead of link and caret
  apart), `navGroupToggleClassName`, `navActiveRowClassName`, `navActiveGroupClassName`, `navRowClassNameFor(item)`;
  rail: `railFlyoutItemClassName`, `railFlyoutActiveItemClassName`, `railTooltipDelayMs`. `ShellNavDisplay` /
  `ShellNavDisplayProvider` carry them (`groupRowHover`, `groupToggleClassName`, `activeRowClassName`,
  `activeGroupClassName`, `rowClassNameFor`, the rail names, `linkProps`).
- Link props: `navLinkProps` (an object or `({ key, href }) => props`, `ShellNavLinkPropsOption`) and `linkProps` on a
  navigation item reach the host's link component (`{ prefetch: false }`) on every in-app link `ShellNavLink` draws;
  never on `external` entries.
- `ShellMobileMenu` (and `AppShell` with the `mobileMenu` prefix): `overlayClassName`, `closeButton` (a button that
  closes the menu; `false`: none), `navClassName`, `footerClassName`, `description` (wired as `aria-describedby`; without
  it the menu stays undescribed as before). `SheetContent` takes `overlayClassName`.
- `ShellBreadcrumbs`: `itemClassName`, `ariaLabel`, `foldBy="viewport"` (fold by the window's width, media queries;
  `BreadcrumbFoldBasis`).
- `AccountMenu`: `triggerAriaLabel`, `initials`, `avatarFallbackOnError` (a failing image shows the initials;
  `AccountAvatar fallbackOnError`, `initials`), entry `className`. `LanguageMenu` / `LanguageMenuSub` /
  `LanguageMenuItems`: `optionClassName`, `checkClassName`, `allowReselect`.

`./shell-background`:

- `ShaderBackground`: `displacementImageSize` (the texture a host image is resampled to; a power of two from 16 to 2048,
  default 256; `displacementTextureSizeOf`, `DISPLACEMENT_IMAGE_SIZE`), `displacementImagePlaceholder` (`noise`
  default, `none`, or a CSS colour on the layer until the image is drawn; an unreadable image falls back to the
  generated field), `observeAttributes` (default `SHADER_BACKGROUND_OBSERVED_ATTRIBUTES`: `class`, `style`,
  `data-theme`), `data-*` on the layer.

`./translations`:

- `AppTranslationsScreen confirmGenerateAll` (`boolean | 'auto'`): absent as before (asks exactly when
  `renderGenerationEstimate` is set); `true` always, `false` never; `'auto'` asks unless the renderer answers `null`
  for `{ kind: 'all' }`. The renderer runs inside the dialog, so `'auto'` probes it before opening: with
  `loadGenerationPreview` the estimate is loaded first (the button is disabled and `aria-busy` meanwhile) and the
  renderer gets its answer; a failed load asks and shows the error. `isGenerationEstimateEmpty` exported.
- `languageFilterOptions(languages) => FilterOption[]`: the language filter's options from the loaded languages
  (restrict to the active ones, label `code · name`).

`./provider`, `./logic`:

- `AdminUiProvider confirmWithRichDescription` (`'package'` or a service): with a host `confirm`, a confirmation whose
  description is not text (an element, a list) goes there instead of the text-only host service (a phrase confirmation
  still goes to `confirmWithPhrase` first). `isTextConfirmDescription`, `routeConfirm`, `ConfirmRoutes`.

`./crons`:

- **Behaviour change**: `sort="severity"` breaks a status tie by name only again, as before 0.3.7: the 0.3.7 tie-break
  by the most recent failure / run made rows of one status swap places between refreshes. `severityTieBreak="recent"`
  restores the 0.3.7 / 0.3.8 order. `compareCronsBySeverity(left, right, options?)` and `sortCrons(crons, sort,
  severityCompare?, options?)` follow the same default (`CronSeverityOptions`); a host calling them without options
  gets the name tie-break.
- `severityStatusOrder` (default `CRON_STATUS_SEVERITY`, unchanged: missing command, failing, overdue, running, ok,
  paused) ranks the statuses, e.g. failing before a missing command; `cronStatusRank(status, order?)`.

Tests: unit tests for the padding, sort arrow, texture size, confirmation routing and crons options; the server render
`options-039-render.mjs` (in `test:render` and the consumer run) and the browser run `browser-options-039.mjs`
(`app/options-039`: select-all cell, track selection cell, group row hover, mobile menu description, avatar fallback,
reselect, confirmation routing, the estimate probe).

## 0.3.8

Fix for hosts that bind their colours in a JS config; no API change.

- `./list` (and every package table: issues, crons, workers, translations): the rule under the header of
  `EntityListTable` read `var(--color-border)` bare (`shadow-[inset_0_-1px_0_var(--color-border)]`). A host that binds
  its colours in a JS config (`@config`) defines no `--color-*` properties, so the rule was missing. The header cells
  now carry `shadow-list-header-rule`, a utility of `components.css` that reads the border colour through the theme
  (`--theme(--color-border)`). The list snapshot changes by that class name only.
- The consumer test's second host (channel values) now binds its colours in a JS config, like such a host, and fails
  on any `var(--color-…)` in the built CSS that the CSS never defines.

## 0.3.7

Optional props for the translations, crons and issues screens and host cache tags per operation. Everything is
additive: a caller that sets none of the new props renders as on 0.3.6, except the tie-break of `sort="severity"` on
`./crons` (see there). The list and form actions snapshots are unchanged.

`./translations`:

- `AppTranslationsScreen languageFilter="multiple"`: "Has a value in any of these languages" as a multi-select; the URL
  key `language` holds the ids comma-separated; the root filter and the expand use `in`
  (`appTranslationValues.languageId in ["3","5"]`), one id filters exactly as the single variant. The helpers
  `buildAppTranslationKeysLanguageFilter`, `appTranslationKeysExpand` and `buildAppTranslationKeysListArgs` take a list
  of ids too (`AppTranslationKeysLanguageSelection`, `appTranslationKeysLanguageIds`).
- `cardSort` (`boolean | { labels }`, default `false`): a sort select in the toolbar while the keys show as cards (the
  card view, and the cards below `md`), with ID, Key and the host columns' `sortKey`s, each ascending and descending;
  labels from `labels`, else the column's text header, else the key.
- `renderGenerationEstimate(preview, scope)` and `loadGenerationPreview(scope)` (also on `TranslationCompleteness`):
  host content in the confirmation before a generation, below the package's text, with a skeleton while the loader
  runs and the error when it fails (the generation can still be confirmed). Scope `{ kind: 'locale', localeId,
  writingStyle, locale }` or `{ kind: 'all' }`; without a loader the renderer gets the package's `previewOnly` answer for
  a locale and `undefined` for all. With the renderer "Generate all missing" asks before it starts (without it, it
  starts on the click as before). `GenerationEstimate`, `startGenerationPreview` and the types are exported.

`./logic`, `./workers`, `./translations` (api factories):

- `tags` per operation: each side keyed (`{ provides: { byOperation: { languages: ['HostLanguages'] }, others: [...] }
  }`) or a function `(operation, kind) => tags` (asked once per operation when the api is created; provided by a query,
  invalidated by a mutation). Operation names are the hook names without `use` and `Query` / `Mutation`
  (`WorkersApiOperation`, `TranslationsApiOperation`, the maps `WORKERS_API_OPERATIONS`, `TRANSLATIONS_API_OPERATIONS`).
  The list form keeps applying to every operation. `InjectedHostTags`' sides accept the keyed form (a reader that took
  them as lists narrows with `Array.isArray`); new `InjectedHostTagsOption`, `InjectedHostTagsByOperation`,
  `InjectedHostTagSelection`, `InjectedHostTagsResolver`, `resolveHostTagsOf`, `resolveHostTagsByEndpoint`,
  `hostTagsMemoKey`; `withHostTags` and `hostTagTypes` take an optional operation name map (and the definitions for the
  function form).

`./crons`:

- `detailsPollingIntervalMs` accepts `number | ((cron) => number)` (`CronPollingInterval`, `resolveCronPollingInterval`;
  the function reads the loaded Cron, 0 until it has loaded; a negative or non-finite answer is 0).
- `sort="severity"`: within a status the most recent failure first (the last run, else the newest failed run of
  `recentExecutions`), then the most recent run, then by name (before: by name only); `compareCronsBySeverity`,
  `cronLastFailureAt`, `cronLastRunAt`. `severityCompare(left, right, defaultCompare)` replaces the order with the
  host's (`CronSeverityCompare`); `sortCrons` takes it as a third argument.

`./issues`:

- `environmentLabels` (screen and drawer) accepts `Record<string, string> | ((code) => string | undefined)`
  (`IssueEnvironmentLabels`, `issueEnvironmentHostLabel`).

Texts: new keys "Has a value in any of these languages", "Sort by", "%label%, ascending", "%label%, descending",
"Generate every missing value?", "Every missing value of every active locale and writing style is generated. The
generation runs in the background.", "The estimate could not be loaded.", "Loading the estimate".

## 0.3.6

Fix for hosts whose colour properties hold channels; no API change. The list and form actions snapshots are unchanged.

- `components.css`: the status badges (`[data-slot=badge][data-tone=…]`, since 0.3.3) read the soft surface through
  the theme binding (`--theme(--color-<status>-soft, <status colour at 15 %>)`) instead of the bare `--<status>-soft`.
  A host with HSL channels in its properties and its own binding (`--success-soft: 101 82% 87%`) got an invalid
  declaration, so the badge had no surface, and `ddd-admin-ui-check-tokens` failed on the plain update from 0.3.2.
  `theme.css` binds `--color-<status>-soft` to `--<status>-soft` (else the status colour at 15 %), so a theme.css host
  renders as before; a host with its own binding binds `--color-<status>-soft` itself (`hsl(var(--success-soft))`) or
  gets the 15 % tint. No other package rule reads a colour role bare (the text roles go through
  `--text-color-<status>`).
- The consumer test builds a second host with channel values and its own binding and runs `ddd-admin-ui-check-tokens`
  on it.

## 0.3.5

Layout fixes; no API change. The list and form actions snapshots are unchanged.

- `./issues`: with `customTrendRange`, the trend range wrapper (`data-slot="issues-trend-range"`) no longer widens the
  page on a phone: it is held to its container, so the window switch scrolls inside itself like the environment and
  status switches (with German labels the page scrolled about 200 px sideways at 390 px).
- `./issues`: the events column of the groups table is 128 px wide and its header stays on one line (a translated
  label wrapped inside the word).
- `./crons`: the description under a Cron's name wraps to two lines and ends in an ellipsis instead of being cut at the
  cell edge.

## 0.3.4

Optional props for hosts moving their workers and app translations screens onto the package, URL list state that
follows outside URL changes, and host cache tags on the api factories. Everything is additive: a caller that sets none
of the new props renders as on 0.3.3, except that `useUrlListState` now takes a URL change from outside (see there) and
the wait-time "unknown" of the runs table opens its reason in the package tooltip instead of a native title. The list
and form actions snapshots are unchanged.

`./workers`:

- `WorkerTransportScreen listMaxTop` and `maxTop` on `WorkerMessageRunsTab` / `WorkerProcessesTab`: how many rows
  "load more" reaches (default `WORKER_LIST_MAX_TOP`, 500; `Infinity`: no cap).
- `renderSection(id, section, state)`: a third argument with the screen's state (`WorkersOverviewSectionState`: window,
  search, monitoring, loading, stale, payload; `WorkerTransportSectionState`: transport, tab, window, outcome, process
  filter, monitoring, detail).
- The throughput description names the payload's windows when they are not 5 / 15 min, 1 h and 24 h
  (`throughputDescriptionText`); the sparkline labels name `sequenceWindowSeconds` (`sequenceLabelText`). Truncated
  process keys, message classes and origins open in the package tooltip (`WorkerTruncatedText`), no native titles.
  `workerMessageRunColumns(t)` exported (the runs table's columns for a host table).
- `createWorkersApi({ tags })`: the host's cache tags, provided by every query and invalidated by the restart.

`./translations`:

- `AppTranslationsScreen`: `transformListArgs` (the list request before it is sent), `languageFilter` ("Has a value
  in": a root filter on the values and the same filter on the expand, so a row shows that language's values; URL key
  `language`, renamable through `urlParamNames`), `extraResetKey` (the host's filters restart the list window and the
  selection), `showGenerateAll`, `showCompleteness`, `cardFooter`, `rowActions(key, defaultActions)`, `renderCard` with
  `parts` (`keyLink`, `values`, `actions`, `card`; an `EntityCardRenderer` still fits), `drawerCreateValue`,
  `mapBulkDeleteResponse`, `editableValueLocale`, `valueActions`. The `sortKey` of a host column (through `columns`)
  is sorted on (`<sortKey> <direction>, id <direction>`).
- `AppTranslationKeyDrawer`: `editableValueLocale` (language and country of a stored value editable; a move onto a
  combination another value holds is refused) and `valueActions` (after Save and Delete).
- `createTranslationsApi({ tags, bulkDelete: { mapResponse } })`: host cache tags; the counts of the endpoint's own
  bulk delete answer (`TranslationsApi.mapBulkDeleteResponse`, `AppTranslationKeysBulkDeleteCounts`).
- Helpers `appTranslationKeysExpand`, `buildAppTranslationKeysLanguageFilter`,
  `APP_TRANSLATION_KEY_LANGUAGE_FILTER_KEYS`; types `AppTranslationKeyCardParts`, `AppTranslationKeyCardRenderer`,
  `AppTranslationKeysListArgs`. `renameUrlStateKeys`' `restore` no longer hands a host parameter under a renamed key's
  own name back as the list's filter.

`./logic`, `./next`:

- `useUrlListState` re-syncs its inputs when the URL changes from outside (Back / Forward, a link to the same page with
  other filters, a host write); the echo of its own write is no change. Helpers `readListValues`,
  `externalListChange`.
- `useEntityDrawer({ createValue })` and `ENTITY_DRAWER_CREATE_VALUE` (`'1'`).
- `withHostTags`, `hostTagTypes`, `InjectedHostTags` (also in `./logic/pure`).
- `useNextUrlStateAdapter({ restore: false })` (no saved state comes back) and `savedKeys` (only these parameters are
  saved for `restore`, not a drawer's `edit` or another list's filters; default the whole query as before).

Texts: new keys "Any language", "Has a value in", "Language of the %locale% value", "Country of the %locale% value";
workers "Failed messages %window%", "Handled messages %window%", "Messages in work %window%", "Waiting messages
%window%", "Worker processes %window%", "Messages finished per transport in each window (%windows%), with the rate and
what one worker finished per minute.".

## 0.3.3

Optional props for hosts moving their tables, shells, translatable fields and operations screens onto the package, a
dependency-free `./logic/pure` entry (also CommonJS), and fixes listed per entry. Everything is additive: a caller that
sets none of the new props renders as on 0.3.2, except two screen defaults (the crons status and runs filters, the
issue copy actions) and the badge's `data-tone` (see there). The form actions snapshot is unchanged; the list snapshot
differs only by `data-tone` on its badges.

`./logic/pure` (new entry):

- The dependency-free helpers of `./logic` in an entry of their own, loadable without React and `@mgamadeus/ddd-web`:
  the navigation model and the crumb resolver (`resolveCrumbs`, `resolveDocumentTitle`, `filterNavigation`, …), list
  sort and tracks, URL list state, sticky parameters, date inputs and presets, colour values, image crop geometry, text
  limits, write access, the injected api helpers, `translateText`. Also built as CommonJS:
  `require('@mgamadeus/ddd-admin-ui/logic/pure')` resolves `dist/cjs` (a CommonJS caller has its own copy of the text
  store; pass `t` where a helper takes one). `./logic` exports the same names as before.
- `NavigationIcon` is typed without React's types (a function or class component taking `NavigationIconProps`;
  `lucide-react` icons and every component that took `className` still fit). `TranslateFn` lives in `./i18n`'s store
  (re-exported where it was).

`./list`:

- `EntityListTable` (and `EntityListBody`): `pinEdge="overlay"` (one scroll-edge rule and shadow per side across the
  header and the body instead of one per pinned cell; `data-list-pin-edges="overlay"`, `data-list-edge-overlay`),
  `selectionColumnWidth`, `indexColumnWidth`, `selectionCellClassName`, `indexCellClassName`, `surface` (the colour of
  header and pinned cells, set as `--list-surface`; new token), `selectAllLabel(loadedCount, hasMore)`,
  `columnWidthBox="content-box"` (a fixed `width` and a `minWidth` name the content; the track adds the cell padding).
- Fixes: Shift with a press in the selection cell (and on the select-all cell) no longer selects page text (the
  mousedown default is prevented with Shift); with `rowHover="action"` the pinned cells of a row without an action no
  longer tint on hover (such a row carries `data-list-row-hover="none"`).
- `EntityListBulkBar`: `deleteTranslate={false}`, `deleteClassName`, `deleteCountClassName`; a choice's `className`
  (its label then sits in a truncating span). With `countClassName` the label is one element (`data-bulk-label`), so
  the button's gap no longer opens between the label, the brackets and the count.

`./form`: `FormDialog` `resultActions` (next to Close in the result state), `submitOnEnter={false}` (Enter in a
single-line field does not submit; the button and ⌘S / Ctrl+S still do), `descriptionProps`. `isolateEvents` already
stopped `pointerdown` and `mousedown` as well as `click` (now documented and covered by a browser test).

`./translations`, `./logic`:

- `TranslatableLanguageInput`: `texts` in the change name every language of the store and of `texts`, not only the
  offered ones (a cleared language maps to `''`); the change carries `reason` (`edit`, `clear-all`, `clear-others`); a
  language keeps the key it was typed in while mounted (emptying FORMAL no longer switches the tab to INFORMAL while
  typing); blank texts are dropped from the reported `store` only, not from the editing state (a leading space is
  typable and reported in `texts`). New `TranslatableLanguageMarkdown` (the same binding for the markdown field).
- Translatable fields: `onChange(value, { reason })`; per-field tabs (`fieldKeys`) keep the key they were typed in
  while mounted; `renderCounter` (a host counter; the built-in one gets an id); the editor's `aria-describedby` points at
  the visible counter (`describedBy` in the render args of `TranslatableMarkdown`). "Clear all" keeps keys that name no
  language (not `<language>:<country>:<style>`) and is off while only such keys hold text.
- `useEntityTranslations`: controlled `activeLocale` / `onActiveLocaleChange`; `buildChangedPayload` (`undefined` when
  no non-blank text differs from the last hydration); `mergeTranslated` skips blank incoming texts.
- Pure: `languageTextsOf` / `storeWithLanguageTexts` take `{ editedKeys, keepBlank }`; `languagesOfStore`,
  `translationsChanged`.

`./shell`, `./shell-background`:

- Parts without the frame: `ShellNavDisplayContext`, `ShellNavDisplayProvider` (`ShellSidebar`, `ShellNavList`,
  `ShellNavRail`, `ShellMobileMenu` draw as inside `AppShell`).
- `AppShell`: `mobileMenuHeader` (default `brand`), `navBadgeClassName`, `navChildListClassName`, `navListClassName`,
  `sidebarNavClassName` (`ShellSidebar navClassName`), `navigationLoading` (skeleton rows in the list and the rail),
  `navOpenGroupKeys` / `onNavOpenGroupKeysChange` (controlled open groups, one per level; a route change reports the
  active group), `railFlyoutClassName`, `railGroupPageRow={false}` (the flyout heading links to the group's page),
  `topBarClassName`, `topBarRowClassName`, `leadingCrumbs`, `search`, `canAccessCrumb`, `breadcrumbFoldWidths`,
  `collapsedStorageValues`, `collapseShortcutOptions`. `ShellTopBar` `rowClassName`, `data-*`.
- `AccountMenu` `triggerVariant="avatar"` (no name, no chevron), `contentClassName`, `header` (a node or `false`),
  `itemClassName`, `afterEntries`, entry `before`; `LanguageMenu` `icon`, `iconVisibility="always"` (the icon below
  640 px too; the trigger itself was never hidden), `contentClassName`, `heading`, `renderOption` (also on
  `LanguageMenuSub` / `LanguageMenuItems` where they apply).
- `ShellBreadcrumbs` `leadingCrumbs`, `search`, `canAccessCrumb`, `foldWidths` (custom thresholds through a scoped
  style; the default classes stay); `EntityLabelResult` `node`, `link`, `state` (`data-crumb-state`).
  `useSidebarCollapsed(key, { values })`, `useShellShortcut(key, onPress, { media, ignoreSelector })`.
- `ShaderBackground`: `displacementScale` per axis (`[x, y]`), `displacementZeroMean` (the field's measured mean as
  its centre; off by default, the default look keeps its offset), `displacementImage` (a host image as the field,
  same-origin or CORS), `paused`; `displacementMean`, `NEUTRAL_DISPLACEMENT_CENTER`.
- `./logic` (navigation): `resolveCrumbs` options `leadingCrumbs` (crumbs of kind `text` with `scope: true`, never in
  a document title), `search`, `canAccessCrumb`; `queryCrumbs` on leaves and routes, `crumbOnly`, `crumbLink`,
  `crumbHidden`; `menuNavigation`, `menuNavigationOf`; types `LeadingCrumb`, `QueryCrumb`, `NavigationIconProps`.

`./crons`:

- `CronsScreen`: a status filter (URL key `status`, with "Need attention") and a Cron filter on the global runs list
  (URL key `runsCron`), shown by default (`statusFilter={false}`, `runsCronFilter={false}`); `sort="severity"` (worst
  first; default `name`); `detailsPollingIntervalMs`, `timelinePollingIntervalMs`, `outputPollingIntervalMs` (default
  0); `timeZone="viewer"` with `serverUtcOffsetMinutes` (`CronTimeDisplayProvider`, `useCronTimeFormat`).
  `CronRunsView` `cronOptions`, `cronFilterId`, `onCronFilterChange`. Helpers `sortCrons`, `CRON_STATUS_SEVERITY`,
  `cronStatusRank`, `matchesCronStatusFilter`, `toCronStatusFilter`, `CRON_ATTENTION_STATUSES`,
  `estimateCronServerOffsetMs`, `normalizeCronName`, `isLegacyCronName`.
- A stored command that cannot be scheduled (or is missing from the build) stays read-only in the form with its reason
  and "Pick another command". A name stored before the kebab-case rule saves unchanged and is found in either spelling.
- Fix: the name in the Crons table clips (`data-slot="cron-name"`) instead of running into the schedule column.

`./issues`: `IssuesScreen` `customTrendRange` (`IssuesTrendRangeControl`; URL keys `from` / `to`, at most 31 days),
`environmentLabels`, `headerActions`, `pagination="load-more"`, `eventSummary`; `IssueEventDetails` `summary`
(`IssueEventSummary`) and `copyActions` (Copy stack, copy file:line; on by default). A job's attempt reads "2 of 3" when
the payload has `maxAttempts`. Helpers `toIssuesWindowValue`, `resolveIssuesCustomRange`, `resolveIssuesTrendRange`,
`issueTopFrame`, `issueFileLineOf`, `issueStackText`, `issueEnvironmentLabel`, `ISSUES_CUSTOM_WINDOW`,
`ISSUES_MAX_RANGE_MS`.

`./database`: a 403 shows the server's message; only the schema-write refusal turns writes off until remount
(`DBApplyFailure.schemaWritesDisabled`, `isSchemaWritesDisabledMessage`, `SCHEMA_WRITES_DISABLED_MESSAGE_PATTERN`,
`SchemaDiffScreen isSchemaWritesRefusal`). A failed apply refetches the diff. "Apply all" is off while a diff has no
signature (unsigned diffs are not bulk targets, `isBulkApplicableDiff`); `applyAllWithBlockedDiffs="disable"`. The card
shows the server's `directApplyBlockReason` and a drift mark (`SchemaDiffCard drifted`, `data-drifted`,
`driftedTableNames`).

`./provider`, `./form`, `./primitives`: `AdminUiProvider confirmWithPhrase` (`'package'` or a function: confirmations
with `requirePhrase` bypass a text-only host `confirm`); `ConfirmDialogView` and its types exported.

`./list`: `StatusBadge` carries `data-tone`; the soft surface binds to `--<status>-soft` with the same 15 % fallback,
with or without `theme.css`. This changes the list snapshot by the added `data-tone` attributes only (nothing else).

`./logic`: `ApiQueryResult.refetch` returns `ApiRefetchCall<TData> | void` (new type; the static hooks return an object
with `unwrap()`).

Texts: new keys "Loading navigation"; crons "All Crons", "All statuses", "Search Crons…", "Pick another command",
"%reading% · next runs (your time):", "Started %start% (your time) · %duration%", "Times are in your time zone, converted
from the server clock…", "This build does not have this command; it is kept as stored.", "This command cannot be
scheduled here; it is kept as stored."; issues "%attempt% of %max%", "Copy file and line", "Copy stack", "Custom" /
"From" / "To" (context `trend-window`), "The range must end after it starts and span at most 31 days."; schema diff
"Changed" (context `schema-diff-drift`), "This diff changed since the previous load.", "This apply is not allowed" and
two plural "Apply all" reasons.

## 0.3.2

Optional props for hosts moving their own lists, forms and frames onto the package. Everything is additive: a caller
that sets none of the new props renders and behaves as on 0.3.1 (the list snapshot of 0.1.0-rc.2 and the form actions
snapshot of 0.1.0-rc.5 are unchanged). Two measurement fixes in `SegmentedControl` apply to everyone (see there).

`./translations`, `./logic`:

- `useEntityTranslations({ offeredTabsOnly })`: tabs for the default and the offered locales only; a stored key, region
  or language that is not offered gets no tab and is still kept and sent back. Also `mergeLocaleKeys(…, { offeredOnly })`
  and `mergeLanguageTabs(…, { offeredOnly })`.
- `useEntityTranslations({ tabModel: 'language', editedKeyPerField })`: the edited key is chosen per field (FORMAL, else
  INFORMAL when only that holds text) instead of once per form. Tabs carry `fieldKeys`; `translationFieldKey(tab, value)`
  resolves the key; the tab label and tooltip follow the field.
- `TranslatableLanguageInput`: one text per language plus the field's full store (`texts`, `store`,
  `onChange({ texts, store })`, `languages`, `activeLanguage`, `styleOrder`). Pure helpers `languageEditedKey`,
  `languageTextsOf`, `storeWithLanguageTexts`, `languageFieldTabs`, `translationKeyOf`, `DEFAULT_STYLE_ORDER`.
- Translatable fields: `autoGenerateDisabledReason` (the AI action off with a tooltip and screen-reader reason,
  independent of `disabled`), `autoGenerateVariant`, `autoGenerateSlot`; `showCounterFrom` (the counter appears from a
  threshold), `announceOverLimit` (a polite live region, once per crossing); `clearOtherLanguages` ("Clear other
  languages", asks first), `clearLabelVisible` (the clear action with its text), `showEditingLanguage` ("Editing: …").

`./list`, `./logic`:

- Range selection: `useRowSelection({ rangeSelection })` selects from the anchor to a Shift-clicked row;
  `anchorKey`, `setAnchorKey`, `setRangeSelected`, `keysBetween`; `setItemSelected` takes the click's modifiers
  (`SelectionModifiers`), which `EntityListTable` now passes.
- `EntityListTable` (and `EntityListBody`): `selectionHitArea="cell"`, `fillWidth` (a filler track for tables of fixed
  and content tracks, before trailing end pins), `stickyHeader="page"` (tables with tracks: the header sticks to the
  page while the body scrolls sideways and follows it), `markUnsortedHeaders` (`aria-sort="none"`), `rowHover="action"`;
  columns take `headerClassName` and `cellClassName`; `emptyIcon` on every list view. Body rows are memoised and resolve
  their row action once per item (keep `columns` and `rowAction` stable).
- `EntityListBulkBar`: per action `variant: 'destructive'`, `translate: false`, `countClassName`, `className`,
  `choicesClassName`; `confirm.cancelLabel`; Delete takes `deleteDisabled`, `deleteHint`, `deleteConfirm`; `countLive`.
- `FilterToggleButton`: `aria-label`, `badgeClassName`, `badgeInvertWhenOpen`, `data-*`; `ClearFiltersButton`: `data-*`.

`./primitives`:

- `SegmentedControl`: `tone="current"` (track and indicator from the surrounding text colour), `indicatorClassName`,
  `tooltipClassName`, an option's `tooltip`; `dragPreview="continuous"`, `dragFrom="selected"`, `dragCursor`, the root's
  `data-dragging`; options carry `data-highlighted`; tokens `--segmented-control-held-duration` /
  `--segmented-control-held-easing` time the press scale. Fixes: the overflow test measures the options (a pressed,
  swollen indicator no longer leaves `data-overflowing` set), and a single option's size change re-measures.
- `DialogContent`: `overlayProps`.

`./form`: `FormDialog` takes `data-*` (on the content), `footerStart`, `result` with `closeLabel` (the outcome replaces
fields and actions, one Close button), `noValidate`, `isolateEvents` (clicks inside the dialog and on its overlay stop
at the dialog).

`./shell`, `./shell-background`:

- `AppShell`: `navRowClassName`, `navRailRowClassName`, `childIconsInList`, `menuButtonClassName`,
  `mobileMenuClassName`, `mobileMenuHeaderClassName`, `style`, `contentStyle`, `contentAttributes`, `data-*` on the root,
  `onCollapsedChange`, `markDocumentCollapsed`. `ShellMobileMenu` `headerClassName`.
- `AccountMenu`: `avatar`, `avatarClassName`, `beforeEntries`; `AccountAvatar` `icon`; `AccountSummary` `avatar`,
  `avatarClassName`. `LanguageMenu` `triggerAriaLabel`, `LanguageMenuSub` `triggerLabel`.
- `ShellDocumentTitle` (and `documentTitle`): `formatTitle`, `reassert`.
- `ShaderBackground`: `displacementScale`, `displacementCells`, `blob1Opacity`, `blob2Opacity` (`ShaderLook`).

Texts: new keys "Clear other languages", "Clear the other languages?", "This removes the text of every language except
%language%. It is gone once you save.", "Editing: %language%", "Close" (context `form-dialog`).

## 0.3.1

Carries the 0.2.2 and 0.2.3 changes (workers screens, app translations, `rowKeyboardActivation`, the translation
helpers; see their sections below) into the 0.3 line, and applies their defaults to the screens new in 0.3.0. The list
snapshot (0.1.0-rc.2) and the form actions snapshot (0.1.0-rc.5) are unchanged.

`./issues`, `./crons`, `./database`:

- Tooltips instead of native titles, as on the workers screens: truncated values (an entry point, an entity class, a
  command, an output line, a description) and the exact time of a next run open the package tooltip on hover,
  keyboard focus and tap; a disabled action (resolve, ignore, reopen, apply, apply selected, apply all, run now, the
  on / off switch, edit, delete) shows its reason as a tooltip on a wrapper that is a tab stop while disabled, and as
  screen-reader text. The issue flags (regression, new) explain themselves in a tooltip; "Approximate" and the 24-hour
  success rate moved from every cell to the column header. The bars of a Cron's run strip and the cells of the
  timeline share one tooltip per strip or timeline (pointer and tap; their accessible names stay). Status badges and
  `AddEntityButton` keep their titles.
- Rows open by keyboard: the issues list, the Crons table and the runs table pass `rowKeyboardActivation` (rows are
  tab stops, Enter / Space opens the drawer).

`./workers`: `WorkerHint` is drawn by an internal shared hint; its markup is unchanged.

## 0.3.0

Three new screen entries on Core's admin traits, and status text roles. A host that sets none of the new roles renders
as before (the list snapshot of 0.1.0-rc.2 and the form actions snapshot of 0.1.0-rc.5 are unchanged); the light status
exceptions of the contrast check are gone, so a host whose status colours fail as text sets the text roles (or writes
its own exceptions).

New entries (mgamadeus/ddd **3.35.1** or later; each follows `./workers`: `createXApi({ baseApi, apiPrefix })`
injects its operations into the host's RTK Query api, `createStaticXApi` answers fixed payloads, links through the
provider's link component, writes under `WriteAccessProvider`, confirmations through `useConfirm`, charts as SVG drawn
by the entry):

- `./issues`: the screen of Core's issues registry (`IssuesControllerTrait`, mgamadeus/ddd 3.35.1 or later).
  `createIssuesApi({ baseApi, apiPrefix })` injects six operations into the host's RTK Query api (tag `AdminUiIssues`;
  resolve, ignore and reopen invalidate the list and the details) and returns the hooks; `createStaticIssuesApi`
  answers fixed payloads (`showcaseIssuesData` in `./showcase`). `IssuesScreen`: environment switch with "All", status
  tabs with their counts, search, section and release filters, the trend window, the page and the open group in the URL
  (optional `urlStateAdapter` / `drawerUrlAdapter`), the registry health (a stalled job makes an empty list "unknown"),
  the trend of the same selection as SVG bars with its notes (step, sum of groups, lower bound, `trendError`), the
  groups last seen first with new / regression flags, 50 per page. `IssueGroupDrawer`: facts, the group's trend,
  where it happens, the last occurrences (`IssueEventDetails`: frames with code context, framework frames folded,
  resolved client frames, raw stack, causes, request, console command, the failed job, client and breadcrumbs),
  `eventsError`, "Open in log backend", "Copy for agent", and `IssueGroupStatusActions` (Resolve / Ignore / Reopen,
  write access; the returned group replaces the row). Also exported: `IssuesTrendBars`, `IssuesTrendCard`,
  `IssuesWindowSwitch`, `IssueFrameList`, `IssueCodeContext`, `IssueCauses`, `IssueWorkerContext`, `IssueDetailBlock`,
  `IssueGroupFlags`, `ISSUE_GROUP_STATUS`, `ISSUE_SECTION_OPTIONS`, the pure helpers (`issueGroupKey`,
  `parseIssueGroupKey`, `resolveIssuesWindow`, `trendBarsOf`, `issueFrameViewsOf`, `segmentIssueFrames`,
  `codeContextRows`, …) and the payload types.
- `./database`: the schema diff screen of Core's `DatabaseModelsControllerTrait` (mgamadeus/ddd 3.35.1 or later).
  `createDatabaseApi({ baseApi, apiPrefix })` injects six operations (tag `AdminUiDatabase`; the three text routes with
  `responseHandler: 'text'`; the applies invalidate nothing, their answer replaces the diff) and returns the hooks;
  `createStaticDatabaseApi(data)` answers fixed payloads (`showcaseDatabaseData`). `SchemaDiffScreen`: counts per
  severity, one `SchemaDiffCard` per table (change type, severity, size and rows, summary per aspect, entity class,
  folded per-aspect changes with the changed attributes and the statements in execution order), Apply per table,
  "Apply selected" and "Apply all" with typed-phrase confirmations, the signature of every shown diff on every apply,
  notices for a signature mismatch (reload), a busy apply lock and a refused apply, a blocked table without any Apply
  action (thresholds, copy-forcing operations, the online-schema-change path), "Schema matches", the 403 of disabled
  schema writes switching every write off, the foreign key checks switch. `GeneratedCodePanel` / `CodeBlock`: the
  SQL of every table, the model code of every entity or of one, on demand, with copy and download. Status maps
  `DB_TABLE_CHANGE_TYPE`, `DB_DIFF_SEVERITY`; helpers `diffSummary`, `countDiffSeverities`, `formatTableSize`,
  `classifyApplyFailure`, `expectedSignaturesOf`, …; the payload types.
- `./crons`: the Crons screen of Core's `CronsControllerTrait` (mgamadeus/ddd 3.35.1 or later).
  `createCronsApi({ baseApi, apiPrefix })` injects the thirteen operations into the host's RTK Query api (tag
  `AdminUiCrons`; create posts to the prefix itself, an update sends only the changed fields) and returns the hooks;
  `createStaticCronsApi` answers fixed payloads (`showcaseCronsData`). `CronsScreen`: the runner's summary as tiles,
  the banner when every active Cron is overdue (the runner does not tick), the Crons table (status, schedule in words
  beside the expression, command, the next run counted down against the server's clock, the last run, the newest 30
  runs as a strip drawn right to left, the 24-hour success rate, Run now / on-off / Edit / Delete), the details drawer
  (definition, next 5 slots, 14-day stats, the durations of the last 100 ended runs, its runs), the runs view (result
  tabs, paged by the total, a run's full output in a dialog) with the timeline heatmap (24 h / 3 d / 7 d), the create
  and edit form (schedulable commands only, composed command line, schedule presets and live preview, 400 field errors
  on their fields). Run now queues (the row says so) and is not offered for a paused, running or missing-command Cron;
  a 409 shows the server's message and keeps Run now off for a minute; delete asks for the Cron's name. Parts,
  `useCronActions`, `useServerClock`, the status maps `CRON_STATUS` and `CRON_EXECUTION_RESULT`, and the pure helpers
  (`describeCronSchedule`, `cronNextRunState`, `changedCronFields`, `formatCronDuration`, …) are exported.

Status text and soft surfaces:

- Optional colour roles `--success-text`, `--warning-text`, `--destructive-text`, `--info-text` (status as text) and
  `--success-soft`, `--warning-soft`, `--destructive-soft`, `--info-soft` (the badge surfaces). `theme.css` binds them:
  `text-success` … read `var(--success-text, var(--success))` (Tailwind's `--text-color-*` namespace), the four 15 %
  badge tints read `var(--success-soft, color-mix(in oklab, var(--success) 15%, transparent))` — the fallbacks are the
  values Tailwind drew before, so StatusBadge, StatusCallout, tone rows, DeltaText and field errors render the same DOM
  and the same colours when a host sets nothing (checked in the consumer run: computed colours with the roles unset
  equal the 0.2.1 values). A host with its own binding points the same utilities at the roles.
- `tokens.json`: the eight roles (`required: false`, `fallback`); the contrast pairs test each text role on `card`, on
  `background` and on its soft surface over a card (12 pairs instead of the five status pairs); `contrast.exceptions`
  is empty.
- `ddd-admin-ui-check-contrast`: an undeclared optional role is evaluated by its fallback (named in the output);
  `color-mix(in <space>, <colour> NN%, transparent)` is understood; a translucent background of a pair with `base` is
  composited over that base.
- `ddd-admin-ui-check-tokens`: names an optional role the host declares but no rule reads.
- The fixture app sets light text roles (`#166534`, `#92400e`, `#b91c1c`, `#0369a1`; dark: the status colours) and
  passes the gated contrast check without exceptions.

Injected apis (`./logic`):

- `InjectedRequest.responseHandler` (`'text'` for a `text/plain` answer, passed on to the base query).
- `staticQueryFailure(error)`: a failed answer of `staticQueryHook`; `staticQueryHook` answers nothing while `skip` is
  set, as RTK Query does.

Checks: server renders of the three entries (`test:render`), a browser run on RTK Query for them
(`browser-operations.mjs`: filters, drawers, typed-phrase confirmations, the 403 and 409 states, 390 px on a 6x
throttled CPU), and the showcase 390 px check on a throttled CPU (after a resize and on a fresh load).

## 0.2.3

The app translations screen gains the host slots and list features hosts kept their own list for, and the key drawer
the value handling. Additive: hosts that pass nothing new get the screen with the new features below (a row number,
sortable id and key, cards below `md`, a delete per row, compact values, the generation confirmation); the list
snapshot (0.1.0-rc.2) and the form actions snapshot (0.1.0-rc.5) are unchanged.

`./translations`:

- `AppTranslationsScreen` host slots: `headerActions`, `moreActions` (the overflow menu), `toolbarTrailing`, `columns`
  (add, reorder or replace the package's), `extraFilters` with `extraActiveFilterCount` and `onClearExtraFilters`,
  `renderCard`, `displayMode` / `onDisplayModeChange` (a view toggle now sits in the toolbar), `useListQuery` (wrap or
  replace the list query).
- List: sorting by id (default newest first) and key (`sort` in the URL), the row number (`showRowIndex`, default
  true), the package's card below `md` and in the card view, a delete per row (asks first), the first four values with
  "+N" (`valuesPreviewCount`), a country code next to a value with a country; "Clear filters" keeps the toolbar
  search; the empty state ("No translation keys found") and the no-results state ("No keys match your search") each
  have their own sentence and an "Add key" action.
- Bulk delete continues past a failure and summarises deleted / failed / skipped keys (`runSequentialWithSummary`), or
  makes one request through the application's endpoint: `createTranslationsApi({ …, bulkDelete: true | { path,
  method, body } })` adds `useBulkDeleteAppTranslationKeysMutation` (`buildAppTranslationKeysBulkDeleteRequest`;
  the static api with `bulkDeleteAppTranslationKeys`).
- Drawer: the key is required (marker and message; Save is no longer disabled while it is empty); an empty template or
  hint is sent as `null`, the hint trimmed (`toAppTranslationKeyBody`); a "Delete key" button; values show and take a
  country (the language's active locales; "Every country" = none), offer only the language's writing styles, cannot be
  saved with an empty text, count for the unsaved-changes question (Cancel, ✕, Esc), and get a search, style and
  context filter and an order from two values on; the add form offers only languages and combinations the key lacks.
- `TranslationCompleteness`: the generation per locale and style asks the cost estimate first (`previewOnly`) and runs
  after a confirmation (`confirmGeneration`, default true), and is offered only for the styles the locale's language
  supports; the toast names the style ("Formal"), not the enum.
- URL names: `drawerEditKey`, `drawerCreateKey`, `urlParamNames` (e.g. `{ id: 'keyId' }`; `renameUrlStateKeys`).
- Shared cache entries: `buildAppTranslationKeysListArgs`, `buildAppTranslationKeysFilter`, `appTranslationKeysOrderBy`,
  `APP_TRANSLATION_KEYS_PAGE_SIZE`, `APP_TRANSLATION_KEY_FILTER_KEYS`, `APP_TRANSLATION_KEY_SORT_KEYS`,
  `DEFAULT_APP_TRANSLATION_KEY_SORT`, `CONTENT_LOCALES_ARG`, `ACTIVE_LANGUAGES_ARG`, `ACTIVE_LOCALES_WITH_COUNTRIES_ARG`,
  `APP_TRANSLATIONS_LANGUAGES_ARG`, `useActiveLocales` (the rows of `useContentLocales`' request). The cache tags stay
  exported (`APP_TRANSLATIONS_TAG`, `LANGUAGES_TAG`, `LOCALES_TAG`).
- Value helpers: `supportedWritingStylesOf`, `appTranslationValueCombination`, `toCountryCodeMap`,
  `appTranslationValueCountryCode`, `filterAppTranslationValues`, `sortAppTranslationValuesBy`, `writingStyleLabel`.
- The static api answers `generateAppTranslations` when given (the preview).

`./list`: `emptyAction` on `EntityListBody`, `EntityListTable` and `EntityListGrid`: one action under the empty and the
no-results state.

Texts: new keys `+%count% more`, `Show fewer`, `A value needs a text; delete it instead.`, `Add key`, `Delete key`,
`Delete the key %key%`, `Delete the key “%key%”?`, `The key and all its values are deleted. This cannot be undone.`,
`Key deleted`, `Failed to delete key`, `Deleting` (context `bulk-progress`), `Deleted` (context `bulk-done`), `key` /
`keys` (context `translation-key-noun`), `Enter the key.`, `Country of the new translation`, `Every country`,
`Every style`, `Singular and plural`, `Writing style`, `Context` (context `translation-value`), `Order` (context
`translation-values`), `Language A–Z`, `Language Z–A`, `Oldest first`, `Newest first`, `Search values…`,
`Search the values of this key`, `No value matches.`, `No keys match your search`,
`The key already has a value for this language, country, style and context.`,
`Generate the missing %style% values for %locale%?`, `Generate` (context `action`), `# key(s) is/are missing.`,
`About # AI request(s).`, `The number of missing keys is not known.`, `The generation runs in the background.`.
Removed: `# key(s) deleted` (the bulk delete's summary is the standard bulk summary now).

## 0.2.2

The workers screens gain what hosts kept their own screens for (synced charts, readouts, keyboard rows, tooltips,
slots, payload windows), the app translations list gets a keyboard path to a key, and the translation helpers cover
several entities and host import kinds. Everything is additive: a caller that passes none of the new props keeps its
behaviour, except where a point below says the screen now shows something else. The list snapshot (0.1.0-rc.2) and the
form actions snapshot (0.1.0-rc.5) are unchanged.

`./workers`:

- Charts: `WorkerChartSyncGroup` shares the hovered step between the time charts below it (the history charts of the
  overview and the five charts of a transport are each one group; `WorkerTimeChart sync={false}` leaves a group).
  `WorkerTimeChart.ticks` takes a tick generator: `countTicks` (whole-number steps, the new default: no 0.25 / 0.5 /
  2.5 on count axes), `durationTicks` (round time units; the duration and wait charts use it), or the host's own;
  `niceTicks(maximum, count, { integer })`, `DURATION_TICK_STEPS_MS`, `WorkerTickGenerator`.
- `WorkerSparkline` reads one step on pointing (value, what it counts, the step's start and end) in the package
  tooltip; `stepSeconds`, `formatValue`, `readout` (default true). The sparkline is wrapped in a
  `data-slot="worker-sparkline"` element.
- Transports table: a row opens its transport by pointer or keyboard (rows are tab stops, Enter / Space), following the
  row's link through the link component; `onOpenTransport` replaces that. The sparkline column header follows
  `sequenceWindowSeconds`; `stepSeconds`, `liveProcesses` (the restart follow-up per row).
- Tooltips instead of native titles (hover, keyboard focus, tap; line breaks kept), through the new `WorkerHint`: the
  last error of a transport and of a message class (time, class and message on lines of their own), the error of a
  message run, the uncounted queue (with its state code), "above range", the process range, the inferred stop reason,
  the timeline lanes and the restart button's disabled reason (also as screen-reader text).
- Process timeline: every lane is a tab stop with its details (state word, full host and pid, start and end, "(last
  heartbeat)" for a lost process, counts, the current message, the stop reason); the axis has three labels (the middle
  one from `sm`) and the date when the span crosses a day.
- Monitoring off: the live panel shows "?" and "monitoring is off" for workers and messages in work, the "In work now"
  tile says "not measured", the process range shows the configured range (`WorkerProcessRange.monitoringEnabled`,
  `WorkersLivePanel.monitoringEnabled`), the banner names the setting (`Common.Workers enabled (WORKERS_ENABLED=1)`),
  and the transport page disables its restart (`WorkerTransportScreen.monitoringEnabled`; by default read from the
  overview query, one request shared with the overview's cache entry).
- `WorkersLivePanel.totals`: the header line uses the backend's totals (the overview screen passes them), "waiting
  messages unknown" when not every queue was counted; the worker counts are left out while the monitoring is off.
- Window labels from the payload: the throughput columns are the payload's windows (Core's four by default, their ids
  unchanged), the per-worker rate uses `recentWindowSeconds` (`WorkersThroughputTable.recentWindowSeconds`), the drain
  estimate the shortest window (its window in a tooltip), the tile hints `sequenceWindowSeconds`.
- Numbers in the UI language: durations, memory, rates and the failed share use its decimal separator
  (`4,2 s` in German); the unit symbols stay. `formatRate`, `formatPercentNumber`, `formatWindowLength`,
  `windowHeaderText`, `inWindowText`, `throughputWindowSeconds`.
- `WorkerRestartButton.liveProcesses`: the result follows each asked process against the live list ("stopped" /
  "waiting to stop", "n of m stopped"); the screens pass it (header, table rows, transport page). The toast is sent
  only when a process was asked; a restart of one transport without a process names it. The restart request now also
  invalidates the history and the message runs (`HISTORY`, `RUNS`), not only `LIVE`.
- `WorkersOverviewScreen`: a refresh button in the header (`showRefreshButton`, default true), `headerActions`, a
  warning with the time of the shown data when a refresh fails, `renderSection(id, section)` (`status`, `live`,
  `throughput`, `history`, `transports`, `loops`), `linkComponent`, `onOpenTransport`. The live description names the
  refresh interval; the history texts name the transports that had a worker and the messages finished in the window.
- `WorkerTransportScreen`: `headerActions`, `renderSection` (`facts`, `history`, `messageClasses`, `liveProcesses`,
  `runs`, `processes`), `linkComponent`, `monitoringEnabled`. New exports: `WorkerTransportFacts`,
  `workerTransportDefinitionText`, `WORKER_TRANSPORT_TABS`, the section id and renderer types.
- Message classes are sorted by finished count (`sortMessageClasses`); the outcome and process filters have an explicit
  "All" chip; a runs or processes list that reached its 500-row cap says so; an unknown state, outcome or display state
  shows as itself in a neutral badge instead of a dash (`rawStatusValue`); the "Other" series keeps a step without any
  reading as a gap (`sumPoints`); the process range turns to the warning colour above the maximum; the throughput
  chart is empty only without finished and redelivered messages; a loop interval that is no whole minute is exact.

`./list`: `EntityListTable` / `EntityListBody` `rowKeyboardActivation` (opt-in): rows with a `rowAction` are tab stops,
Enter or Space runs the action.

`./logic`: a nested `WriteAccessProvider` that denies with a `reason` adds it to an outer denial without one (it still
never widens).

`./translations`:

- `AppTranslationsScreen`: the key is a link to its drawer (`?edit=<id>`, or `keyHref(key)`): a plain click opens the
  drawer in place, a modified click a new tab; rows are tab stops (Enter / Space opens the key).
- `useEntitiesTranslator`: several drafts in one `translateEntities` request per locale, one translations store per
  draft (`EntitiesTranslator`, `EntitiesTranslationRequest`). `TranslatableEntityPayload.objectType` accepts `null`.
- `ConfigImportCard` / `useConfigImport`: any `kind` with the host's `operation` (answers the imported count) and
  translated `texts` (`ConfigImportTexts`, `ConfigImportOptions`), e.g. countries.
- Languages / Locales: the header import button describes what it imports (its title); the writing-styles select
  carries the write-access reason.

Texts: new keys `%minutes% min`, `%percent% % of the last %window%`, `%stopped% of %asked% stopped`,
`(last heartbeat)`, `All`, `At the rate of the last %window%`, `Last %window%`, `Last error %time%`,
`No message finished in the last %window% and every queue is empty.`,
`No worker process of %transport% is running right now: nothing to restart.`, `Now: %messageClass%`, `Refresh now`,
`Refreshed every %seconds% s.`, `Setting: %setting%.`, `Showing the data of %time%.`, `Showing the last data that
loaded.`, `Showing the newest %count%. Narrow the filter to reach older ones.`, `The worker overview could not be
refreshed.`, `every %duration%`, `in the last %window%`, `last %window%`, `monitoring is off`,
`nothing finished in %window%`, `pid %pid%`, `stopped` (context `worker-restart`), `waiting messages unknown`,
`waiting to stop`, the plurals `# transport(s) had a worker in this window` and `# message(s) finished in this window`,
and for the import of a host kind `Import from the configuration`, `Import from the configuration?`,
`Creates or updates every configured row, matched by its key.`, `No import operation for “%kind%”.`,
`Imported # row(s) from the configuration`. Changed: `Last error %time%: %message%` became `Last error %time%` (the
class and the message follow on their own lines).

## 0.2.1

The showcase no longer widens the page at phone width; 0.2.0 was tagged but not published, so 0.2.1 is the first
release of the 0.2.0 content.

- `SegmentedControl`: a track that turns wider than its container scrolls inside itself from the same frame on
  (`data-overflowing`, set by the resize observer before the paint). Before, the scrolling waited for React's next
  render, and until then the options spilled out of the track: after a resize to phone width on a slow device the page
  scrolled sideways.
- Showcase: every sample row and every section scrolls a wider specimen inside itself (`min-w-0 overflow-x-auto`), never
  the page; the samples carry `data-showcase-sample`, the section contents `data-showcase-section-content`.
- Consumer check: when the showcase widens the page at 390 px, the check prints the widest elements past the viewport
  with their section, sample, widths and the container they spill from.

## 0.2.0

All additions below are optional props, new exports or new entries: a caller that uses none of them renders the same
DOM (the list snapshot of 0.1.0-rc.2 and the form actions snapshot of 0.1.0-rc.5 are unchanged).

New entries:

- `./data`: `MetricTile` (label, value, icon, delta, hint, sparkline slot, `isLoading` skeleton, `compact`),
  `MetricTileSkeleton`, `MetricGrid`, `DeltaText` (signed change in the UI language; `preference` higher / lower /
  none; `format` number / percent / explicit `Intl.NumberFormatOptions`; arrow, sign and a hidden word), `NoteList`, and
  `resolveDelta`, `relativeChange`, `deltaDirectionOf`, `deltaToneOf`.
- `./markdown` (optional peers `@uiw/react-md-editor` ^4.1.0 and `rehype-sanitize` ^6.0.0, imported after hydration,
  never from another entry): `MarkdownEditor`, `MarkdownPreview`, `renderMarkdownEditor(options)` for the
  `renderEditor` slot and `AdminUiProvider.renderMarkdownEditor`, `MARKDOWN_ROW_HEIGHT`, `loadMarkdownLibrary`,
  `useMarkdownLibrary`, `extendMarkdownSanitizeSchema`, `MARKDOWN_IMAGE_ATTRIBUTES`, `remarkLineBreaks`. The preview is
  sanitised (raw HTML parsed, then GitHub's rules plus images; a single newline is a line break); the editor follows the
  nearest `.dark` ancestor; the server draws a skeleton; a failed load falls back to a plain text area.
- `./workers`: the screens of Core's worker monitoring (`WorkersControllerTrait`, mgamadeus/ddd 3.23.1 or
  later). `createWorkersApi({ baseApi, apiPrefix })` injects the six operations into the host's RTK Query api (tag
  `AdminUiWorkers`; the restart request invalidates the live reads) and returns the hooks. `WorkersOverviewScreen`:
  totals as tiles with sparklines, the monitoring-off and sampler banners, the live row per transport with its
  processes, the throughput table per window, the history of every transport over a window switch (1 h – 14 d), the
  transports table by state severity, the loops, the restart of all workers (confirmed). `WorkerTransportScreen`:
  facts, five charts (queue, workers with the configured range, throughput, duration and wait with a logarithmic axis
  when the maximum dwarfs the average), message classes, live processes, and the tabs Message runs and Processes (with
  a lifetime timeline). Their parts are exported, with the status maps `WORKER_TRANSPORT_STATE`,
  `WORKER_PROCESS_STATE`, `WORKER_MESSAGE_OUTCOME` and the payload types. Charts are SVG drawn by the entry (no chart
  library, no optional peer); a step without a reading is a gap, never a 0.
- `./shell`: the application frame and its navigation, mechanism in the package, content from the host.
  - `AppShell` (type `AppShellProps`): fixed top bar (`ShellTopBar`: banner, menu button, `brand`, `topBarStart`, the
    breadcrumbs, `topBarEnd`; frosted once the page scrolls, `data-shell-scrolled`), fixed sidebar from `lg`
    (`ShellSidebar`: `<nav>` landmark, nested groups as disclosure buttons with one open group per level, the current
    entry `aria-current="page"`, badges, lock marks, external marks; `sidebarHeader`, `sidebarRailHeader`,
    `sidebarFooter`), the icon rail (`ShellNavRail`: groups as flyout menus, tooltips) toggled by the foot row and `[`
    (`useShellShortcut`; not while typing, in a dialog or menu, or below `lg`), remembered in localStorage per
    `collapsedStorageKey` (`useSidebarCollapsed`, applied right after hydration, followed across tabs), the mobile menu
    below `lg` (`ShellMenuButton`, `ShellMobileMenu`: a sheet from the inline-start edge, closes on a followed link or
    a route change), the content frame (`<main>` behind a "Skip to content" link), an optional `background` and
    `documentTitle`.
  - `ShellBreadcrumbs`: the crumbs of the current path from the same navigation; entity names through the host's
    `useEntityLabel` hook (types `UseEntityLabel`, `EntityLabelRequest`, `EntityLabelResult`); the middle folds into an
    ellipsis menu with the full path on narrow trails (container queries).
  - `ShellDocumentTitle`: keeps `document.title` on the page's name (`Details · Blue widget · Admin`).
  - `AccountMenu` (name, description, avatar or initials, entries as links or actions, `children`, a `fallback`
    without a session), `AccountAvatar`, `AccountSummary`; `LanguageMenu` (languages with native names in their own
    `lang`, the current one checked, `onChange`, `isPending`, `note`), `LanguageMenuItems`, `LanguageMenuSub`.
  - `ShellNavigationProvider` / `ShellNavigationContext` / `useShellNavigation`: breadcrumbs and title without the
    frame. Logical sides throughout (RTL with Radix's `Direction.Provider`).
- `./shell-background`: `ShaderBackground`, an animated WebGL background (two soft blobs over the base
  colour, generated displacement, a quarter resolution at 20 fps, held when hidden or idle), loaded lazily; nothing
  without WebGL or with reduced motion. Colours from `--shell-background-base`, `--shell-background-blob-1`,
  `--shell-background-blob-2` (falling back to `--background`, `--brand-light`, `--accent`); `tint`,
  `tintShaderPalette`.
- `./design-studio`: `designStudioComponents`, the `components` of `@mgamadeus/ddd-design-studio`'s provider
  (studio 0.7.x), every slot mapped to the block of the same name; typed against `DesignStudioComponentsContract`, a
  structural copy of the studio's slot types, so the entry neither imports the studio nor depends on it. Checks: a type
  test (exactly the contract's slots), a server render of every slot (`test:render`), and the map assigned to the
  published studio 0.7.3 type in a consumer.
- `ddd-admin-ui-check-contrast <css> [tokens.json]` (bin): WCAG 2.x contrast of the pairs `tokens.json` declares
  (`contrast.pairs`, 4.5 for text, 3 for large text and UI parts; `role/NN` backgrounds), light and dark; fails on a pair
  below its minimum that no exception list names, and on a value it cannot compute (unless `--allow-unevaluated`).
  `--exceptions <file.json>` adds a host's written exceptions (same entry format) to the package's. The package lists
  the five light status pairs (`success` on `card`; `success`, `warning`, `destructive`, `info` on their 15 % tints) as
  exceptions: status colours used as text or on their tint, themed by the host, until an emphasis role exists. Gated in
  the consumer runs (CI and release) on the fixture app's built CSS, whose dark `--primary` moved from `#3b82f6` to
  `#3472d8` (white on it: 3.68:1 → 4.62:1).

Lists:

- `FilterDateRange presets` (`true` or the host's list; `preset` / `onPresetChange`, `onRangeChange`, `today`): all
  time, today, last 7 days, last 30 days, custom on a `SegmentedControl`; a preset writes the same `YYYY-MM-DD` bounds as
  typed dates, so "Clear filters" is "All time" again; the resolved range shows next to the label; custom reveals the two
  fields without a second visible label. Pure helpers in `./logic`: `DEFAULT_DATE_RANGE_PRESETS`,
  `resolveDateRangePreset`, `dateRangePresetOf`, `addCalendarDays`, `localToday`, `CUSTOM_DATE_RANGE_PRESET` (types
  `DateRange`, `DateRangePreset`).
- Bulk runs with skipped rows: a run of `runSequential` / `runSequentialWithSummary` returns `skipSequential(reason?)`
  for a row it leaves alone; the outcome gains `skipped`, the toast reads `Deleted 3 of 5 tracks · 2 skipped` (clauses
  per reason through `skipReasons`). `bulkSummaryText`, `bulkOutcomeCounts`, `summarizeSkipReasons` for bulk endpoints
  (types `BulkOutcomeCounts`, `SequentialSkip`, `SequentialSkipMark`).
- Column factories in `./list`: `textColumn`, `numberColumn`, `moneyColumn` (currency required), `dateColumn`,
  `booleanColumn`, `imageColumn`, `idColumn`, `statusColumn`, `actionsColumn` (type `ColumnFactoryOptions`); each
  returns an `EntityListColumn`, display id, sort key and filter are separate, formats explicit.
- `EntityListColumn.width: 'content'`: a track as wide as its widest cell (`max-content`, measured after hydration),
  also among pinned columns (`actionsColumn` uses it with `pin: 'end'`). `isContentTrack`, `listTrackLayoutTemplate`
  in `./logic`.
- `EntityListBody tableBreakpoint` and `EntityListViewToggle tableBreakpoint`: `md` (default), `lg`, `always` (type
  `ListTableBreakpoint`).
- `EntityListBulkBar`: an action with `choices` opens a menu (`choicesLabel`, `onChoose`; `onClick` is optional now),
  `confirm` asks through `useConfirm()` with the count filled in (`%count%`, ICU plurals), `hint` shows a tooltip (also
  on a disabled action), `moreOnServer` notes that only the loaded rows are selected (types
  `EntityListBulkActionChoice`, `EntityListBulkActionConfirm`).
- `FilterToggleButton`, `FilterCountBadge`, `ClearFiltersButton`: the toolbar's controls for a host's own filter row or
  sheet (the toolbar renders them, same DOM).
- `Combobox translate` and `ComboboxOption.translate` (also the group heading), `QuickFilterPills translate` and
  `QuickFilterOption.translate`: `false` for texts from the server.
- `DateCell locale` (default: the provider's `formatLocale`, else the UI language); `formatDate`, `formatDateTime`,
  `formatRelativeTime`, `uiDateTimeFormat`, `uiRelativeTimeFormat` take an optional locale. `ImageCell bordered`,
  `objectFit`, `imageClassName`.
- `EntityListEmpty clearSearchSize` (the built-in "Clear search" is `sm`, `xs` when compact).

Primitives:

- `SegmentedControl`: `heightOf: 'option'` (the option carries the height, the track adds its padding),
  `coarsePointer: 'grow'` (44 px options and an 8 px gap on touch, `--segmented-control-coarse-option-height`,
  `--segmented-control-coarse-gap`), `badgeStyle: 'unstyled'` (also per option; there a falsy badge renders nothing),
  `translate: false` (the `aria-label` and the option texts as given), `style` on the root, `pressFeedback`
  (`--segmented-control-held-scale`). The indicator takes the selected option's box, so a host track padding insets it
  like the options. Optional variables, unset by default: `--segmented-control-easing`,
  `--segmented-control-option-duration`, `--segmented-control-option-easing`, `--segmented-control-track-duration`,
  `--segmented-control-track-easing`. Measured in headless Chromium against an earlier host control in seven call-site
  shapes (fine and coarse pointer): track, indicator and option geometry, timings and widths equal.
- `./primitives`: `PathnameProvider`, `PathnameContext`, `useCurrentPathname`, `useBrowserPathname`, type
  `UsePathname`. `AdminUiProvider.usePathname` sets the pathname hook of every block; `./next` ships
  `useNextPathname`. Without it: `location.pathname` after hydration.

Pages, forms, media, translations:

- `RouteError` (`onRetry`, optional `onReport` with its own pending / sent / failed state, `title`, `description`,
  `detail`, `variant`) and `RouteLoading` (`list`, `detail`, `form`; `rows`, `inset`) in `./page`.
- `./page`: `MaintenanceActionCard` — a maintenance action with its run button (write access applies), pending state
  and the outcome of the last run.
- `ColorValueField` in `./form`: an explicit `format` (`hex`, `hex-alpha`), `letterCase`, presets, `clearable`; typed
  text is normalised on blur and refused when it is not a colour of that format. `parseHexColor`, `formatHexColor`,
  `normalizeColorValue` in `./logic` (types `ColorValueFormat`, `RgbaValue`).
- `FormDrawer modal={false}` (with `nonModalFrom`, `nonModalClassName`): beside the page from `md` up, no overlay, the
  page stays clickable, a click outside never closes it; below that the modal drawer. `useMediaQuery`,
  `BREAKPOINT_QUERIES` in `./logic`.
- `ImageCropDialog` in `./media` (types `ImageCropDialogProps`, `ImageCropResult`): one picked image, aspect choices
  (free, ratio, round), move, resize, wheel and pinch zoom, arrows and +/− on the focused frame; Apply answers the
  cropped and normalised blob, "Use original" the untouched file, Cancel `onCancel`; a corrupt file shows an error.
  `normalizeImage`, `decodeImage`, `renderNormalizedImage`, `ImageNormalizeError` / `isImageNormalizeError` (`code`
  `decode`, `too-large`, `encode`, `unsupported`) in `./logic`: EXIF orientation, crop, round clip, size limits without
  upscaling, alpha kept, an optional `runInWorker` adapter with a main-thread fallback; the crop geometry
  (`initialCrop`, `moveCrop`, `resizeCrop`, `zoomCrop`, `planImageNormalization`, …) too. Upload, validation and presets
  stay with the host.
- Translatable inputs: `useEntityTranslations({ tabModel: 'language', styleOrder, initialLocale })`: one tab per
  language, each editing one full key chosen deterministically and named on the tab when not FORMAL; the language's
  other keys stay and go back in the payload (`mergeLanguageTabs`, `translationLanguageOf`, `TranslatableLocale.otherKeys`).
  `maxLength` / `countText` on `TranslatableInput`, `TranslatableMarkdown` and their form-bound variants: a counter in
  code points, the over-limit tab marked, `aria-invalid`, nothing cut; `AdminUiProvider textLimits` sets the defaults by
  kind; `focusFirstOverLimitTranslation(container)` in `./translations`; `countCodePoints`, `overLimitKeys`,
  `TextLimitsContext`, `useTextLimits` in `./logic`. `MarkdownEditorRenderArgs.invalid`.
- `./translations` gains the admin screens on the application's translation controllers (the entities of
  mgamadeus/ddd-common-translations and -political): `createTranslationsApi({ baseApi, apiPrefix, paths? })` (tags
  `AdminUiAppTranslations`, `AdminUiLanguages`, `AdminUiLocales`; a locale write refetches the locales and the
  completeness), `AppTranslationsScreen` (keys with their values per `locale::style`, search and filters, bulk delete,
  "Generate all missing"), `AppTranslationKeyDrawer` (key fields, one row per value, a new value),
  `TranslationCompleteness` (per active locale and writing style, generation per locale and style), `LanguagesScreen`
  (active and writing styles in place), `LocalesScreen` (`isActive` and the default flags in place), `ConfigImportCard`
  / `useConfigImport` (import of the configured languages or locales), `useEntityTranslator` (one
  `translateEntities` request per target locale, for `useTranslationRunner`) and `useContentLocales`.

Logic:

- `./logic`: the navigation model (types `NavigationItem`, `NavigationLeaf`, `NavigationGroup`, `NavigationIcon`,
  `NavigationAccess`, `CrumbRoute`, `CrumbLabel`, `CrumbParams`, `ResolvedCrumb`, `ActiveNavigation`) and its pure
  resolvers: `findActiveNavigation`, `isNavigationLeafActive`, `isNavigationGroupActive`, `filterNavigation` (the rights
  predicate), `resolveCrumbs`, `resolveDocumentTitle`, `documentTitleParts`, `normalisePathname`.
- `./logic`: the api injection of the screen entries (`InjectableBaseApi`, `ApiQueryHook`, `ApiMutationHook`,
  `injectEndpointsOnce`, `toQueryString`, `staticQueryHook`, `staticMutationHook`), `useMemoryUrlState` (search
  parameters in component state for a screen without a router adapter) and `useOptimisticRowPatches` (in-place edits
  of list rows with rollback).

Provider and contract:

- `AdminUiProvider formatLocale` and `textLimits`; `FormatLocaleContext`, `useFormatLocale` in `./i18n`.
- `tokens.json`: the optional `--segmented-control-*` variables above and the `contrast` key.
- `tokens.json`: layer `--layer-chrome` (30), optional properties `--sidebar-w` (16rem), `--sidebar-rail-w` (5rem) and
  the three `--shell-background-*` colours, data attributes `data-shell`, `data-shell-collapsed`,
  `data-shell-content`, `data-shell-sidebar`, `data-shell-topbar`, `data-shell-scrolled`, `data-shell-background`,
  `data-nav-key`. `components.css` sets the defaults and reserves the sidebar width on `[data-shell-content]`.
- README: the layers checklist (dialogs open at `--layer-overlay` 50; a host with a higher overlay scale raises it).

Showcase, import matrix, checks:

- Showcase: sections `./markdown` (through `loadMarkdown`), `./data`, `./workers`, `./shell` (an interactive frame
  with the background, folding breadcrumbs, the menus), the translation admin screens and `MaintenanceActionCard`,
  samples of the new blocks; the sample payloads `showcaseWorkersData`, `showcaseTranslationsData` (with
  `createStaticWorkersApi` / `createStaticTranslationsApi`); `SHOWCASE_COVERAGE` lists every new entry and block.
- Import matrix: `./data` and `./markdown` import logic, i18n and primitives (`./markdown` types only from
  translations); `./workers` logic, i18n, primitives, list and page; `./translations` additionally list and page and,
  from form, `Form`, `FormActions`, `FormDrawer`, `FormField`, `FormSubmitButton`; `./shell` logic, i18n and
  primitives; `./shell-background` no other entry; `./design-studio` primitives, list, page and glass; `./showcase`
  also data, workers, shell and shell-background.
- Checks: `browser-blocks.mjs` in the Next consumer (date presets, bulk menus with a counted confirmation, a
  content-sized pinned actions column, the segmented control's option height, translatable limits, the colour field,
  the route error, the side-by-side drawer, `./markdown` after hydration) and unit tests of the new pure helpers and of
  `check-contrast`.
- Checks: unit tests of both injections (operations, paths, tags, invalidation; the workers one also on the real RTK
  Query store where the install has it), `screens-render.mjs` in `test:render` (both entries on the sample payloads,
  write access disables restart, generation, toggles and imports), and `browser-screens.mjs` in the Next consumer
  (real RTK Query with an in-memory base query: window switch, restart and refetch, chart tooltip, tabs and filters,
  the `isActive` toggle with its refetches, the key drawer, the import, 390 px).
- Checks: resolver unit tests; `shell-render.mjs` (server render: one navigation for sidebar, breadcrumbs and title,
  the rights predicate, no stored state on the server, `./shell` never reaches `./shell-background`); browser checks of
  the shell (active entry, rights predicate, collapse by button and `[`, restored after a reload without a hydration
  warning, rail flyout, mobile menu, folding breadcrumbs, title, RTL).

Fixes:

- A ReactNode description of `PageHeader`, `SectionHeader`, `DetailHeader`, `MediaItemField` and `TranslatableField`
  renders in a `<div>` (a string or number stays in the `<p>`).

## 0.1.0

First stable release: 0.1.0-rc.6 plus the description fix below. Published under the `latest` dist-tag; prereleases
stay on `next`. In short, the release candidates brought (details in the sections below):

- the blocks and their entries `./logic`, `./i18n`, `./primitives`, `./list`, `./page`, `./form`, `./translations`,
  `./media`, `./glass`, `./provider`, `./next`, `./notify-sonner`, the stylesheets `./theme.css` and
  `./components.css`, the manifests `./tokens.json` and `./i18n-keys.json`, the bins and `STANDARDS.md` (rc.2);
- list tables with column tracks, pinned columns, sortable headers, a row index, and status contexts (rc.3);
- `SegmentedControl`, the `./showcase` entry and per-column sort cycles (rc.4);
- Combobox server search, clearing, groups and a create row, selectable rows, `CopyButton`, date input and storage
  helpers, the provider's link component with sticky parameters (rc.5);
- `FormDialog`, the header slot and the document-level save shortcut of `FormActions`, `useConfirm` on the provider
  with `requirePhrase` and a queue, and write access as a presentation aid (rc.6).

Fix:

- A description that is not a string or number (two paragraphs, a list, a `<div>`) renders in a `<div>` instead of the
  `<p>` of `DialogDescription` / `SheetDescription`, with the same classes, `data-slot` and `aria-describedby` wiring:
  no `<p>` nested in a `<p>`, no hydration warning. Covers `useConfirm` / `ConfirmOptions.description`,
  `FormDialog.description`, `FormDrawer.description` and `MediaItemPickerDialog.description`. A string description
  renders the same DOM as in 0.1.0-rc.6. Consumer checks in the browser: a block description in `useConfirm`,
  `FormDialog` and `FormDrawer` (a `<div>` referenced by `aria-describedby`, no `<p>` in a `<p>`, no console error or
  hydration warning), a string description still a `<p>`.

## 0.1.0-rc.6

All additions are optional props or new exports: a caller that uses none of them renders the same DOM as in
0.1.0-rc.5, proven by a server-render snapshot taken from 0.1.0-rc.5 (`form-actions-snapshot.html`: `FormActions`,
`FormSubmitButton`, `AddEntityButton`, `EntityListBulkBar`, `EntityDetailShell`, `FormHeader`, `DetailHeader`), next to
the list snapshot from 0.1.0-rc.2 (`pnpm test:render`; icons are reduced to their own classes, so the snapshot holds
at every lucide-react the peer range admits).

- `FormDialog` in `./form` (type `FormDialogProps`): a form in a dialog with or without a form library. Props `open`,
  `onOpenChange`, `title`, `description`, `children`, `submitLabel`, `pendingLabel`, `cancelLabel`, `isPending`,
  `isDirty` (a close request asks "Discard changes?"), `submitDisabled`, `submitVariant` (`default` / `destructive`),
  `ignoreWriteAccess`, `className`, `onSubmit`, and an optional react-hook-form instance `form` (then `FormField` works
  inside and `onSubmit` gets the parsed values; react-hook-form stays a peer). A real `<form>`: Enter in a text field
  and ⌘S submit it; a dialog opened from it is its own form (its submit never reaches this one). Escape, the backdrop
  and Cancel are ignored while pending or while the promise `onSubmit` returns runs; after a failed submit the dialog
  is usable again. The focus returns to the element that had it when the dialog opened.
- `FormActions`:
  - ⌘S / Ctrl+S listens on `document`. Inside a dialog or drawer (`[role="dialog"]`, `[role="alertdialog"]`) it answers
    anywhere inside the innermost container holding the focus; elsewhere with focus in the form, on the actions (also
    portalled) or nowhere (`body`). In scope it prevents the default, also while the primary is disabled (then nothing
    submits); an event already `defaultPrevented` is left alone, so of two forms only one answers. It submits with
    `form.requestSubmit(submitter)`, the actions' own submit button linked to the form first, else any submit button the
    form owns. (Before: a listener on the form only; focus on `body` or on a portalled footer did nothing.)
  - `placement: 'auto' | 'row' | 'header'` (`header` is new). `auto` moves the pill into the header slot closest above
    the form when one is mounted, else it stays as before; `header` asks for the slot (without one: as `auto`); `row`
    never moves. In a slot the actions are the same pill, floating under the top bar (`--nav-h`) once the header
    scrolls away while the form is in view; the portalled submit button is linked back with the `form` attribute.
  - Inside a dialog that is not a `FormDrawer` the actions render the plain row by themselves (as `sticky={false}`);
    `sticky` without a value is now "pill on a page, row in a dialog", an explicit `sticky` keeps the pill there.
- Header slot in `./primitives`: `FormActionsSlotProvider`, `FormActionsSlot` (types `FormActionsSlotProviderProps`,
  `FormActionsSlotProps`); `EntityDetailShell formActionsSlot` (brings its own provider; a nested shell takes the
  actions of its own forms), `FormHeader formActionsSlot` and `DetailHeader formActionsSlot` (inside a provider around
  header and form). Of several slots in one provider the one closest above the form wins.
- `useConfirm()` in `./logic` (with `ConfirmContext`): `confirm(options): Promise<boolean>` of the nearest
  `AdminUiProvider`, which draws the dialog; nothing to render in the screen. Calls queue; each settles exactly once; an
  unmounted provider settles its pending calls with `false`; Strict Mode safe; the focus returns to the element that
  asked. Without a provider every call answers `false` with one warning outside production. `AdminUiProvider.confirm`
  takes the host's own service (then `useConfirm()` calls it and the package dialog does not render).
  `createConfirmQueue` (types `ConfirmQueue`, `ConfirmQueueEntry`) is the queue behind it. `useConfirmDialog` stays.
- `ConfirmOptions.requirePhrase` and `requirePhraseLabel`: the confirm button stays off until the phrase is typed
  (trimmed, exact), in `useConfirm` and `useConfirmDialog` alike. `useConfirmDialog` now also returns the focus to the
  element that had it when the dialog opened (before: Radix focused no trigger).
- Write access in `./logic`: `WriteAccessProvider value={{ allowed, reason? }}` (nestable, a subtree only narrows; no
  provider = allowed), `useWriteAccess()`, `WriteAccessContext`, `narrowWriteAccess`, `WRITE_ACCESS_ALLOWED`, types
  `WriteAccess`, `WriteAccessProviderProps`. Honoured by `FormSubmitButton`, `FormDialog`'s submit, the actions and
  Delete of `EntityListBulkBar` (not Clear) and `AddEntityButton` as a button (never as a link); the reason is the
  disabled control's title. `ignoreWriteAccess` on `FormSubmitButton`, `FormDialog` and `EntityListBulkAction` for a
  control that only reads. A presentation aid: it replaces no handler guard and no server check.
- Showcase: samples of `FormDialog`, `useConfirm` (with a phrase), the header slot and write access;
  `SHOWCASE_COVERAGE` lists `FormDialog`, `FormActionsSlotProvider`, `FormActionsSlot`.
- Text keys: new `Cancel__form-dialog`, `Type “%phrase%” to confirm`. `Cancel__confirm-dialog` and
  `Confirm__confirm-dialog` are now used by `primitives/confirmDialogView.tsx` (the shared dialog).
- DOM of the new paths only: `data-form-actions-slot` on a slot, `data-form-actions-placement="header"` and
  `data-form-actions-floating` on the pill in a slot, `data-confirm-phrase` around the phrase field.
- Docs: `STANDARDS.md` § 14 (form dialogs and confirmations) and § 15 (write access; the toolbar and bulk sections no
  longer pass the write flag to every control), § 8 header slots; README provider props and confirmations; the skill.
- Consumer checks: the snapshot from 0.1.0-rc.5 and write access (server render); in the browser `FormDialog` (Enter,
  pending, failed submit, a nested dialog, two forms on a page, focus return), the shortcut (focus on `body`, a drawer
  footer button outside the form, focus in another form, a disabled primary, two nested dialogs), header slots (closest
  slot, nested shells, `row`, the `form` attribute, the floating pill) and `useConfirm` (Escape, focus back to the
  trigger, queue, phrase, inside a drawer, two providers, Strict Mode, unmount); unit tests for the confirm queue, the
  missing-provider answer and the write access merge.

## 0.1.0-rc.5

- `EntityListTable` / `EntityListBody`: `rowClassName(item, index)` for extra row classes.
- `useRowSelection`: `isSelectable(item)`. A row it refuses gets a disabled checkbox; "Select all loaded", the header
  state, the count and `selectedKeys` take selectable rows only. `EntityListSelection` gains the optional
  `isItemSelectionDisabled` (a row without a key still gets no checkbox).
- `Combobox`: `clearable` (a clear control; re-picking the picked option clears; without it the value is kept, as
  before), `onSearch` (server search: no client filtering, debounced 300 ms, `''` on close; the list never shows the
  previous term's options) with `isSearching`, option `group` (headings in first-appearance order) and `badge`,
  `onRequestCreate` (a "Create “…”" row while no label equals the trimmed term), `selectedOption` (the label of a picked
  value outside the options), `popoverClassName`; `COMBOBOX_SEARCH_DEBOUNCE_MS`. With `clearable`, `className` sizes a
  wrapper around trigger and clear control.
- `./logic`: `useLatestSearch` (only the answer to the last term counts; aborts the previous request), date input
  values `toDateInputValue`, `fromDateInputValue`, `toDateTimeInputValue`, `fromDateTimeInputValue` with an explicit
  `'local' | 'utc'` zone (`DateInputZone`), `withStickyParams(href, names, currentSearch)`, the guarded storage helpers
  `readStored` / `writeStored` (`StorageArea`, moved from the Next adapters, which use them from here) and
  `buildStorageKey(prefix, area, name)` → `<prefix>.<area>.<name>`.
- `CopyButton` in `./list`: `value`, `label`, `reveal` (`always` / `hover`), `notify` (a toast through `notify`).
- Links: `AdminUiProvider.linkComponent` sets the router link of every block that renders a link (`EntityTabs`,
  `SectionHeader` tabs, `EntityDetailShell` back link, `AddEntityButton`, and `BreadcrumbLink` with an `href`); a
  block's own `linkComponent` still wins. Without the provider prop every link renders as before.
  The link contract (`PageLinkProps`, `PageLinkComponent`, `AnchorLink`) moved to `./primitives` with
  `LinkComponentContext`, `LinkComponentProvider`, `useLinkComponent`; `./page` still exports the old names.
- `EntityListEmpty size="compact"`: one inline line. `DefinitionList layout="rows"`: divided rows, label left, value
  right. `FilterDateRange hideLabel` with `fromLabel` / `toLabel` (and `className`) for an inline range.
- `PageFrame` / `EntityListPage` `asSpecimen`: no `data-page-frame`, no full-height frame (used by the showcase, so a
  host rule keyed to the attribute no longer fires there).
- `SegmentedControl`: a control wider than its container scrolls inside itself, keeping the selected and the focused
  option in view (touch swipes scroll then, the drag preview stays for mouse and pen); options no longer shrink.
  Options take `context` (passed to `t()`) and `translate: false` for already translated text.
- `ConfirmOptions.description`: documented — may be a React node; the package's own confirmations pass plain text.
- Showcase: samples of the new props and blocks; specimen cells shrink (`min-w-0`), so a wide specimen does not widen
  the page at 390 px.
- DOM change: `FormActions` renders `data-form-actions="admin-ui"` (was an empty value), and `components.css` selects
  that value only, so a host's own action bar with a bare `data-form-actions` is no longer restyled.
- Text keys changed (move host translations):
  - `Search for a command to run...` → `Search for a command to run…`
  - the translation progress statuses got the context `translation-status`: `Waiting`, `Translating`, `Done`,
    `Failed`, `Cancelled` → `Waiting__translation-status`, `Translating__translation-status`,
    `Done__translation-status`, `Failed__translation-status`, `Cancelled__translation-status`.
    `Translating…` (the running button label) stays a separate key: a button text, not a status word.
  - new: `Clear`, `Copied`, `Could not copy`, `Create “%term%”`.
- Consumer checks: Combobox in the browser (out-of-order answers, picked label outside the results, reset on close,
  keyboard through groups and the create row, clearing), selectable rows, SegmentedControl in a 358 px container, the
  showcase at 390 px without page scroll and without `data-page-frame`, links through the provider's link component
  keeping sticky parameters; unit tests for the date values (UTC and Europe/Berlin around midnight and both clock
  changes), `withStickyParams` and the storage helpers.

## 0.1.0-rc.4

- `SegmentedControl` in `./primitives`: one value out of a few. Props `value`, `onValueChange`, `options` (`value`,
  `label`, `icon`, `badge`, `description`, `disabled`, `disabledReason`, `className`), `aria-label` (required),
  `height` (32 / 36 / 40 / 48), `iconOnly`, `fullWidth`, `selection` (`surface` / `primary`), `tone`
  (`default` / `onBrand`), `activation` (`automatic` / `manual`), `className`; types `SegmentedControlProps`,
  `SegmentedControlOption`. A radio group (`role="radiogroup"`, `role="radio"` + `aria-checked`, one tab stop): arrows,
  Home and End move and select (manual: move the focus, Space / Enter select), right to left aware, disabled options
  skipped with their reason announced and shown as a tooltip, `description` announced through `aria-describedby`,
  `badge` hidden from assistive technology, `iconOnly` keeps the label as name and tooltip. A sliding indicator,
  measured after layout, without motion under reduced motion; at least a 44 px target on coarse pointers. Pressing and
  dragging across the options previews the choice; the value changes once on release; Escape or a cancelled pointer
  restores it; a touch drag starts only after a sideways movement. New optional properties in `tokens.json`:
  `--segmented-control-radius` (9999px) and `--segmented-control-duration` (200ms), defaults in `components.css`.
- New entry `./showcase`: `Showcase` draws every block of the package in the host's theme, light and dark, one section
  per entry, with the host's sections appended (`sections`, `themes`, `omit`); `SHOWCASE_COVERAGE` lists the drawn
  components per entry. It needs none of the optional peers: `./notify-sonner` loads lazily through `loadNotifySonner`
  and is skipped without it or when the import fails; `./next` is described, never imported. Its texts stay out of
  `i18n-keys.json` (the manifest builder skips the entry). `check-package` allows the entry the block entries only.
- List table sort: `EntityListColumn.sortStart` (`'asc'` / `'desc'`, the first direction when the column becomes
  sorted) and `sortRequired` on `EntityListTable` / `EntityListBody` (never unsorted: the third click returns to the
  first direction). `nextListSort(current, key, { start, required })` takes the same cycle (new type `ListSortCycle`);
  calls without it keep the old cycle. A sortable header with `align: 'end'` puts the arrow before the label.
- Consumer checks: SegmentedControl in the browser (roles, both activation modes, right to left, disabled reason,
  description, icon-only name and tooltip, drag preview with one change on release and none on Escape or cancel); the
  showcase rendered on the server, bundled for the browser without optional peers and hydrated in the Next app; the
  sort cycle with `sortStart` on an end-aligned column. The fixture app sets its UI language in one shared module.

## 0.1.0-rc.3

- List table, all optional (a table without the new props renders the same DOM and classes as 0.1.0-rc.2, proven by
  a server-render snapshot taken from 0.1.0-rc.2, `pnpm test:render`):
  - Column tracks: `EntityListColumn.width` (`'1fr'`, `'2fr'`, `'120px'`), `minWidth` (px, default 120), `align`
    (`start` / `center` / `end`). One column with a width gives every column a track (default `1fr`); share columns
    never go below their minimum, and when the minimums exceed the visible width the table scrolls sideways inside its
    card. A table with tracks is one CSS grid (every row a subgrid, table roles kept); without any width the layout
    stays content-sized.
  - Pinned columns: `pin: 'start' | 'end'`. `end` always holds; `start` only while the table overflows by 120 px or
    more and the pinned columns take less than a third of the visible width. In a table using tracks, pins or the row
    index, the selection column and the row index always pin. A pinned cell paints the card surface and its edge only
    while content scrolls under it.
  - Sortable headers: `sortKey` on the column, `sort` / `onSortChange` on `EntityListTable` and `EntityListBody`;
    not sorted → ascending → descending → not sorted, `aria-sort`, the header content is a button. The table never
    sorts rows itself.
  - Row index: `showRowIndex`, a leading `#` column, 1-based among the loaded rows (new text `Row number`).
  - Sizes are measured after hydration only (server and hydration render use the CSS form of the same tracks).
- `EntityListBody.renderOwnView(mode)`: a view that owns its data and states, drawn in the list card as is, without
  the paged list's skeletons, empty and error states and tail. `renderExtraView` is unchanged.
- `./logic`: `nextListSort`, `parseListSort`, `formatListSort` (`key:asc`), `EntityListSort`, `ListSortDirection`; the
  pure track and pin mechanics `computeListTracks`, `listTrackTemplate`, `minimumListWidth`, `hasListTracks`,
  `resolveListPins`, `shouldHonourStartPins`, `LIST_COLUMN_MIN_WIDTH`, `LIST_PIN_MAX_VISIBLE_SHARE`,
  `LIST_PIN_MIN_OVERFLOW` and their types (`ListColumnWidth`, `ListColumnPin`, `ListColumnAlign`, `ListTrack`,
  `ListTrackLayout`, `ListPinRequest`, `ListPinPlacement`, `ListPinMeasure`, `ListPinLayout`).
- Status contexts: `StatusDefinition.context` and `defineStatusMap(map, { context })` (`StatusMapOptions`; the
  definition's context wins). `StatusBadge` translates label and description with it. `m()` takes an optional
  `{ context }` (`MarkOptions`) that text exports read: `m('Failed', { context: 'import-status' })` → key
  `Failed__import-status`. Existing calls are unchanged.
- `tokens.json`: data attributes `data-list-tracks`, `data-list-pin`, `data-list-pin-edge`, `data-list-overflow-start`,
  `data-list-overflow-end` (read by `components.css`). No new colour role or custom property.
- Removed the optional peer `recharts` (no entry used it).
- Docs: pin the exact version while the package is in 0.x prereleases; neutral examples in `STANDARDS.md`; the list
  section and the skill describe the new table props.
- Consumer checks: the no-prop snapshot and the status context (server render), and a list page with tracks, pins, sort
  and row index in the browser (pin guard at three widths, sideways scroll inside the card at 390 px, sort cycle).

## 0.1.0-rc.2

- The real blocks replace the sample source. Entries: `./logic` (pure helpers, React hooks, browser helpers),
  `./i18n`, `./primitives`, `./list`, `./page`, `./form`, `./translations`, `./media`, `./glass`, `./provider`,
  `./next`, `./notify-sonner`, plus `./theme.css`, `./components.css`, `./tokens.json` (31 colour roles, properties,
  layers, data attributes, utilities per role) and `./i18n-keys.json` (128 texts). `STANDARDS.md` describes how list,
  detail, form and drawer screens are composed.
- Removed: the `./data` entry (no blocks yet).
- `radix-ui` is a peer (`^1.8.1`), no longer a dependency: the host installs one Radix copy.
- Exports use the `default` condition (was `import`).
- New bins: `ddd-admin-ui-check-tokens`, `ddd-admin-ui-check-radix`, `ddd-admin-ui-i18n-manifest` (scripts shipped in
  `dist/scripts`); `scripts/check-tokens.mjs` at the package root is gone. `ddd-admin-ui link-skills` is unchanged.
- `check-package` follows the rules as built: client boundaries without a hook are listed, not failed; runtime and
  type-only edges are checked apart, with file limits for `page → list`, `form → page` and `translations → form`;
  the declarations compile in a strict consumer (bundler and nodenext); the text manifest is compared against the
  built JS; the `utilities` lists of `tokens.json` must equal a fresh extraction.

## 0.1.0-rc.1

- First published version of the scaffold (the content of 0.1.0-rc.0).
- Release step: the version is part of `i18n-keys.json`, so a version bump is followed by `pnpm i18n:manifest`
  before the commit; the release checks refuse a stale manifest.

## 0.1.0-rc.0 (tagged, not published: its manifest named the former version)

- Repository scaffold: unbundled `tsc` build with per-file `'use client'` directives, `check-package` (13 rules, a
  failing fixture per rule), `check-tokens` for hosts, the i18n key manifest, consumer tests (Next 16 build,
  hydration, overlays, CSS, optional peers, strict type checks), CI and the tag release workflow, and the
  `ddd-admin-ui link-skills` command. Sample source only.
