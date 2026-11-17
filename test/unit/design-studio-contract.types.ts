// Type test (run by `pnpm typecheck`): designStudioComponents fills exactly the slots of the studio's contract.
// The contract is a structural copy of `DesignStudioComponents` from `@mgamadeus/ddd-design-studio` 0.7.x
// (src/design-studio/contract.ts); the consumer check against the published studio types is in the README.
import { designStudioComponents } from '../../src/design-studio/index.ts';
import type { DesignStudioComponentsContract } from '../../src/design-studio/contract.ts';

type SameKeys<A, B> = [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [never, never] ? true : false;

export const fillsTheContract: DesignStudioComponentsContract = designStudioComponents;
export const sameSlots: SameKeys<DesignStudioComponentsContract, typeof designStudioComponents> = true;
