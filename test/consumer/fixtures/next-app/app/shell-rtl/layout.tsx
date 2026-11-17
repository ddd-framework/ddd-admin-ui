import type { ReactNode } from 'react';
import { ShellFixture } from '../shell/ShellFixture';

export default function ShellRtlLayout({ children }: { children: ReactNode }) {
  return <ShellFixture dir="rtl">{children}</ShellFixture>;
}
