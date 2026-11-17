'use client';

import { Boxes, FileText, Home, LogOut, Settings, Shapes, UserRound, Users } from 'lucide-react';
import { createContext, type ReactNode, useContext, useState } from 'react';

import type { NavigationItem } from '../../logic/index.ts';
import { LinkComponentProvider, type PageLinkComponent } from '../../primitives/index.ts';
import { ShaderBackground } from '../../shell-background/index.ts';
import { AccountMenu, AppShell, LanguageMenu, LanguageMenuSub, ShellBreadcrumbs, type UseEntityLabel } from '../../shell/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

type Entity = 'item';

const NAVIGATION: NavigationItem<Entity>[] = [
  { key: 'home', label: 'Home', href: '/', exact: true, icon: Home },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: Boxes,
    children: [
      {
        key: 'items',
        label: 'Items',
        href: '/items',
        icon: Shapes,
        badge: 3,
        crumbs: [
          { segment: 'create', label: 'Create item' },
          { segment: ':itemId', entity: 'item', children: [{ segment: 'details', label: 'Details' }, { segment: 'history', label: 'History' }] },
        ],
      },
      { key: 'reports', label: 'Reports', href: '/reports', icon: FileText, lockedReason: 'Not in your plan' },
    ],
  },
  { key: 'people', label: 'People', href: '/people', icon: Users },
  { key: 'secret', label: 'Hidden by the rights predicate', href: '/secret', icon: Settings },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { key: 'general', label: 'General', href: '/settings', exact: true },
      { key: 'old-settings', label: 'Old settings', href: 'https://example.com/settings', external: true },
    ],
  },
];

const NAMES: Readonly<Record<string, string>> = { '42': 'Blue widget' };
const useDemoEntityLabel: UseEntityLabel<Entity> = ({ id }) => ({ text: NAMES[id] ?? null });
const canAccess = (item: { key: string }) => item.key !== 'secret';

const LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic' },
];

/** Links of the demo change its pathname instead of the page. */
const DemoNavigateContext = createContext<(href: string) => void>(() => {});
const DemoLink: PageLinkComponent = ({ href, children, onClick, ...rest }) => {
  const navigate = useContext(DemoNavigateContext);
  return (
    <a
      {...rest}
      href={href}
      onClick={event => {
        event.preventDefault();
        onClick?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
};

const DemoFrame = ({ children, label }: { children: ReactNode; label: string }) => (
  // a transformed box: the shell's fixed bars and the background stay inside it
  <div role="group" aria-label={label} className="relative h-[30rem] w-full overflow-hidden rounded-2xl border bg-background [transform:translateZ(0)]">
    {children}
  </div>
);

/** The `./shell` and `./shell-background` section. */
export const ShellShowcase = () => {
  const [pathname, setPathname] = useState('/items/42/details');
  const [language, setLanguage] = useState('en');
  return (
    <Samples>
      <Sample title="AppShell (one navigation: sidebar, breadcrumbs, mobile menu), ShaderBackground">
        <DemoNavigateContext.Provider value={setPathname}>
          <LinkComponentProvider linkComponent={DemoLink}>
            <DemoFrame label="Application frame sample">
              <AppShell
                navigation={NAVIGATION}
                canAccess={canAccess}
                useEntityLabel={useDemoEntityLabel}
                pathname={pathname}
                collapsedStorageKey="ddd-admin-ui.showcase.sidebar"
                collapseShortcut={null}
                className="min-h-full"
                background={<ShaderBackground className="pointer-events-none absolute inset-0 -z-10" />}
                brand={<span className="px-1 text-sm font-bold">Admin</span>}
                topBarEnd={
                  <>
                    <LanguageMenu languages={LANGUAGES} current={language} onChange={setLanguage} />
                    <AccountMenu
                      name="Alex Example"
                      description="Staff account · #7"
                      entries={[
                        { key: 'account', label: 'My account', icon: UserRound, href: '/account' },
                        { key: 'sign-out', label: 'Sign out', icon: LogOut, onSelect: () => {}, separatorBefore: true },
                      ]}
                    >
                      <LanguageMenuSub languages={LANGUAGES} current={language} onChange={setLanguage} />
                    </AccountMenu>
                  </>
                }
              >
                <div className="space-y-2 p-6">
                  <p className="text-sm text-muted-foreground">
                    Current path: <code>{pathname}</code>
                  </p>
                  <p className="text-sm text-muted-foreground">Follow the sidebar or the breadcrumbs; the rail toggle sits at the sidebar's foot.</p>
                </div>
              </AppShell>
            </DemoFrame>
          </LinkComponentProvider>
        </DemoNavigateContext.Provider>
      </Sample>
      <Sample title="ShellBreadcrumbs folding in a narrow container">
        <DemoNavigateContext.Provider value={setPathname}>
          <LinkComponentProvider linkComponent={DemoLink}>
            <div className="w-full max-w-[36rem] rounded-xl border px-3 py-2">
              <ShellBreadcrumbs navigation={NAVIGATION} useEntityLabel={useDemoEntityLabel} pathname="/items/42/history" />
            </div>
            <div className="w-full max-w-[13rem] rounded-xl border px-3 py-2">
              <ShellBreadcrumbs navigation={NAVIGATION} useEntityLabel={useDemoEntityLabel} pathname="/items/42/history" />
            </div>
          </LinkComponentProvider>
        </DemoNavigateContext.Provider>
      </Sample>
    </Samples>
  );
};
