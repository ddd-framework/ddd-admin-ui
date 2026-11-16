import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { linkSkills, type Logger } from '../../src/cli/linkSkills.ts';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const collect = () => {
  const lines: string[] = [];
  const logger: Logger = { info: (line) => lines.push(`info ${line}`), warn: (line) => lines.push(`warn ${line}`) };
  return { lines, logger };
};

/** A consumer project with the package installed, shipping the given skills. */
const consumer = (skills: string[]): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'link-skills-'));
  roots.push(root);
  const packageDir = path.join(root, 'node_modules', '@mgamadeus', 'ddd-admin-ui');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), '{"name":"@mgamadeus/ddd-admin-ui","version":"0.1.0"}');
  for (const skill of skills) {
    fs.mkdirSync(path.join(packageDir, '.claude', 'skills', skill), { recursive: true });
    fs.writeFileSync(path.join(packageDir, '.claude', 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
  }
  return root;
};

describe('linkSkills', () => {
  it('links every shipped skill and is idempotent', () => {
    const root = consumer(['ddd-admin-ui-specialist']);
    const { logger } = collect();
    assert.deepEqual(
      linkSkills({ cwd: root, logger }).map((result) => result.action),
      ['linked'],
    );
    const link = path.join(root, '.claude', 'skills', 'ddd-admin-ui-specialist');
    assert.ok(fs.lstatSync(link).isSymbolicLink());
    assert.ok(fs.existsSync(path.join(link, 'SKILL.md')));
    assert.equal(fs.readlinkSync(link), path.join('..', '..', 'node_modules', '@mgamadeus', 'ddd-admin-ui', '.claude', 'skills', 'ddd-admin-ui-specialist'));
    assert.deepEqual(
      linkSkills({ cwd: root, logger }).map((result) => result.action),
      ['unchanged'],
    );
  });

  it('repoints an existing symlink', () => {
    const root = consumer(['ddd-admin-ui-specialist']);
    fs.mkdirSync(path.join(root, '.claude', 'skills'), { recursive: true });
    fs.symlinkSync('../elsewhere', path.join(root, '.claude', 'skills', 'ddd-admin-ui-specialist'), 'dir');
    const { logger } = collect();
    assert.deepEqual(
      linkSkills({ cwd: root, logger }).map((result) => result.action),
      ['relinked'],
    );
  });

  it('never touches a real directory', () => {
    const root = consumer(['ddd-admin-ui-specialist']);
    const own = path.join(root, '.claude', 'skills', 'ddd-admin-ui-specialist');
    fs.mkdirSync(own, { recursive: true });
    fs.writeFileSync(path.join(own, 'SKILL.md'), 'own\n');
    const { lines, logger } = collect();
    assert.deepEqual(
      linkSkills({ cwd: root, logger }).map((result) => result.action),
      ['skipped'],
    );
    assert.equal(fs.readFileSync(path.join(own, 'SKILL.md'), 'utf-8'), 'own\n');
    assert.match(lines.join('\n'), /^warn .*not a symlink/m);
  });

  it('reports a package that is not installed', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'link-skills-'));
    roots.push(root);
    const { lines, logger } = collect();
    assert.deepEqual(linkSkills({ cwd: root, logger }), []);
    assert.match(lines.join('\n'), /^warn @mgamadeus\/ddd-admin-ui is not installed/m);
    assert.ok(!fs.existsSync(path.join(root, '.claude')));
  });

  it('reports a package version that ships no skills', () => {
    const root = consumer([]);
    const { lines, logger } = collect();
    assert.deepEqual(linkSkills({ cwd: root, logger }), []);
    assert.match(lines.join('\n'), /^info @mgamadeus\/ddd-admin-ui 0\.1\.0 ships no agent skills/m);
  });
});
