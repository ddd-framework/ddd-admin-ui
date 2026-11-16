import * as fs from 'node:fs';
import * as path from 'node:path';

export const PACKAGE_NAME = '@mgamadeus/ddd-admin-ui';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

const PREFIX = '[ddd-admin-ui]';

export const consoleLogger: Logger = {
  info: (message) => console.log(`${PREFIX} ${message}`),
  warn: (message) => console.warn(`${PREFIX} ${message}`),
};

export interface LinkSkillsOptions {
  cwd?: string;
  /** Directory holding the package's skills. Default `<cwd>/node_modules/@mgamadeus/ddd-admin-ui/.claude/skills`. */
  sourceDir?: string;
  logger?: Logger;
}

export type LinkSkillAction = 'linked' | 'relinked' | 'unchanged' | 'skipped';

export interface LinkSkillsResult {
  skill: string;
  action: LinkSkillAction;
  target: string;
}

/** `@mgamadeus/ddd-admin-ui <version>` of the installed package, or the bare name when the version is unknown. */
const packageLabel = (packageDir: string | undefined): string => {
  if (packageDir) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8')) as {
        version?: unknown;
      };
      if (typeof manifest.version === 'string') return `${PACKAGE_NAME} ${manifest.version}`;
    } catch {
      // no readable manifest: fall back to the bare name
    }
  }
  return PACKAGE_NAME;
};

/**
 * Symlinks every skill directory of the installed package into `<cwd>/.claude/skills/`. Idempotent; an existing
 * symlink is repointed, a real file or directory is never touched. A package version that ships no skills, or a
 * missing package, is reported (nothing is created).
 */
export const linkSkills = (options: LinkSkillsOptions = {}): LinkSkillsResult[] => {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const logger = options.logger ?? consoleLogger;
  const packageDir = path.join(cwd, 'node_modules', ...PACKAGE_NAME.split('/'));
  const sourceDir = options.sourceDir ? path.resolve(cwd, options.sourceDir) : path.join(packageDir, '.claude', 'skills');
  if (!options.sourceDir && !fs.existsSync(packageDir)) {
    logger.warn(`${PACKAGE_NAME} is not installed in ${cwd} (no ${packageDir}) — nothing to link.`);
    return [];
  }
  const skills = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    : [];
  if (skills.length === 0) {
    logger.info(`${packageLabel(options.sourceDir ? undefined : packageDir)} ships no agent skills (${sourceDir}) — nothing to link.`);
    return [];
  }
  const targetDir = path.join(cwd, '.claude', 'skills');
  fs.mkdirSync(targetDir, { recursive: true });

  const results: LinkSkillsResult[] = [];
  for (const entry of skills) {
    const linkPath = path.join(targetDir, entry.name);
    const linkTarget = path.relative(targetDir, path.join(sourceDir, entry.name));
    let action: LinkSkillAction;
    const existing = fs.lstatSync(linkPath, { throwIfNoEntry: false });
    if (!existing) {
      fs.symlinkSync(linkTarget, linkPath, 'dir');
      action = 'linked';
    } else if (!existing.isSymbolicLink()) {
      action = 'skipped';
    } else if (fs.readlinkSync(linkPath) === linkTarget) {
      action = 'unchanged';
    } else {
      fs.unlinkSync(linkPath);
      fs.symlinkSync(linkTarget, linkPath, 'dir');
      action = 'relinked';
    }
    const message = `${action.padEnd(9)} .claude/skills/${entry.name} → ${linkTarget}`;
    if (action === 'skipped') logger.warn(`${message} (exists and is not a symlink — left as is)`);
    else logger.info(message);
    results.push({ skill: entry.name, action, target: linkTarget });
  }
  return results;
};
