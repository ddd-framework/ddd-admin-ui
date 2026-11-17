'use client';

// The shell in a Next app: one navigation tree feeds the sidebar, the mobile menu, the breadcrumbs and the document
// title; the pathname comes from the provider (useNextPathname), links from the Next link; a rights predicate hides an
// entry; an entity hook names the item crumb (loading first, then the name).
import { Boxes, FileText, Home, LogOut, Settings, Shapes, ShieldOff, Users } from 'lucide-react';
import Link from 'next/link';
import { Direction } from 'radix-ui';
import { type ReactNode, useEffect, useState } from 'react';
import type { NavigationItem } from '@mgamadeus/ddd-admin-ui/logic';
import { LinkComponentProvider, type PageLinkComponent } from '@mgamadeus/ddd-admin-ui/primitives';
import { AccountMenu, AppShell, LanguageMenu, type UseEntityLabel } from '@mgamadeus/ddd-admin-ui/shell';

type Entity = 'item';

const navigationOf = (base: string): NavigationItem<Entity>[] => [
  { key: 'home', label: 'Home', href: base, exact: true, icon: Home },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: Boxes,
    children: [
      {
        key: 'items',
        label: 'Items',
        href: `${base}/items`,
        icon: Shapes,
        badge: 2,
        crumbs: [
          { segment: 'create', label: 'Create item' },
          { segment: ':itemId', entity: 'item', children: [{ segment: 'details', label: 'Details' }, { segment: 'members', label: 'Members' }] },
        ],
      },
      { key: 'reports', label: 'Reports', href: `${base}/reports`, icon: FileText, lockedReason: 'Not in your plan' },
    ],
  },
  { key: 'people', label: 'People', href: `${base}/people`, icon: Users },
  { key: 'secret', label: 'Secret area', href: `${base}/secret`, icon: ShieldOff },
  {
    key: 'settings',
    label: 'Settings',
    href: `${base}/settings`,
    icon: Settings,
    children: [
      { key: 'settings-overview', label: 'Overview', href: `${base}/settings`, exact: true },
      { key: 'users', label: 'Users', href: `${base}/settings/users` },
    ],
  },
];
const NAVIGATION = { ltr: navigationOf('/shell'), rtl: navigationOf('/shell-rtl') };

const canAccess = (item: { key: string }) => item.key !== 'secret';

// the name arrives after a moment, as from a query
const useFixtureEntityLabel: UseEntityLabel<Entity> = ({ id }) => {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setText(`Item ${id} name`), 200);
    return () => clearTimeout(timer);
  }, [id]);
  return { text, isLoading: text === null };
};

const NextLink: PageLinkComponent = ({ href, children, ...rest }) => (
  <Link href={href} {...rest}>
    {children}
  </Link>
);

const LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
];

export const ShellFixture = ({ dir = 'ltr', children }: { dir?: 'ltr' | 'rtl'; children: ReactNode }) => {
  const [language, setLanguage] = useState('en');
  return (
    <Direction.Provider dir={dir}>
      <div dir={dir}>
        <LinkComponentProvider linkComponent={NextLink}>
          <AppShell
            navigation={NAVIGATION[dir]}
            canAccess={canAccess}
            useEntityLabel={useFixtureEntityLabel}
            collapsedStorageKey={`fixture.sidebar.${dir}`}
            documentTitle={{ appName: 'Fixture' }}
            brand={<span id="brand">Fixture</span>}
            topBarEnd={
              <>
                <LanguageMenu languages={LANGUAGES} current={language} onChange={setLanguage} />
                <AccountMenu name="Alex Example" entries={[{ key: 'sign-out', label: 'Sign out', icon: LogOut, onSelect: () => {} }]} />
              </>
            }
            mobileMenuFooter={<p id="menu-footer">Signed in as Alex Example</p>}
          >
            <div className="p-6">{children}</div>
          </AppShell>
        </LinkComponentProvider>
      </div>
    </Direction.Provider>
  );
};
