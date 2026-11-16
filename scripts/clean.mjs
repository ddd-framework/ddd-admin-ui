// Removes the build output before tsc runs (tsc never deletes files of removed sources).
import { rmSync } from 'node:fs';

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
