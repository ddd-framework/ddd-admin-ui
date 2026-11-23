import { Suspense } from 'react';
import { FilesStickyFixture } from './FilesStickyFixture';

export default function FilesStickyPage() {
  return (
    <Suspense>
      <FilesStickyFixture />
    </Suspense>
  );
}
