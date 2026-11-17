import type { ReactNode } from 'react';
import { ShellFixture } from './ShellFixture';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellFixture>{children}</ShellFixture>;
}
