import { Suspense } from 'react';

import { CronsFixture } from './CronsFixture';

export default function CronsPage() {
  return (
    <Suspense>
      <CronsFixture />
    </Suspense>
  );
}
