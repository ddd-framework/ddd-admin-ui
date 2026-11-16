export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';

export interface StatusDefinition {
  /** Untranslated label; blocks translate it when they render. */
  label: string;
  tone: StatusTone;
}

export type StatusMap<Status extends string> = Readonly<Record<Status, StatusDefinition>>;

/** Declares the label and tone of every value of a status enum (server-safe, no React). */
export const defineStatusMap = <Status extends string>(map: StatusMap<Status>): StatusMap<Status> => Object.freeze(map);

/** The definition of a status, or a neutral fallback that shows the raw value. */
export const statusDefinitionOf = <Status extends string>(map: StatusMap<Status>, status: string): StatusDefinition =>
  (map as Record<string, StatusDefinition | undefined>)[status] ?? { label: status, tone: 'neutral' };
