'use client';

import { createStaticDatabaseApi, SchemaDiffCard, SchemaDiffScreen } from '../../database/index.ts';
import { staticQueryFailure } from '../../logic/pure/injectedApi.ts';
import { showcaseDatabaseData } from '../databaseFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticDatabaseApi(showcaseDatabaseData);
const FORBIDDEN = {
  status: 403,
  data: { error: "Schema writes are disabled on this process: it shares another stage's database. Apply schema changes through the process that owns the database." },
};
const emptyApi = createStaticDatabaseApi({ ...showcaseDatabaseData, diff: { diffs: { elements: [] } }, databaseTablesSql: staticQueryFailure(FORBIDDEN) });
const blocked = (showcaseDatabaseData.diff && 'diffs' in showcaseDatabaseData.diff ? showcaseDatabaseData.diff.diffs.elements : [])?.find(
  diff => diff.directApplyBlocked
);

/** The `./database` section: the schema diff screen on sample payloads (no request), a blocked card, the empty state. */
export const DatabaseShowcase = () => (
  <div className="space-y-10">
    <Sample title="SchemaDiffScreen (createStaticDatabaseApi)">
      <div className="w-full min-w-0">
        <SchemaDiffScreen api={api} />
      </div>
    </Sample>
    {blocked && (
      <Sample title="SchemaDiffCard: blocked by the large-table guard, details open">
        <div className="w-full min-w-0">
          <SchemaDiffCard diff={blocked} defaultExpanded />
        </div>
      </Sample>
    )}
    <Sample title="SchemaDiffScreen: schema matches; the tables SQL refused (403)">
      <div className="w-full min-w-0">
        <SchemaDiffScreen api={emptyApi} />
      </div>
    </Sample>
  </div>
);
