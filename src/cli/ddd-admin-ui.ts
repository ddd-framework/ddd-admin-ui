#!/usr/bin/env node
import { linkSkills } from './linkSkills.ts';

const HELP = `Usage:
  ddd-admin-ui link-skills    Symlink the package's agent skills into .claude/skills/
  ddd-admin-ui help           Show this help
`;

const [command] = process.argv.slice(2);
if (command === 'link-skills') {
  linkSkills();
} else if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
  process.stdout.write(HELP);
} else {
  process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
  process.exitCode = 1;
}
