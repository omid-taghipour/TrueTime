#!/usr/bin/env node
// Keeps the version number in sync across package.json, src-tauri/Cargo.toml,
// and src-tauri/tauri.conf.json, instead of hand-editing all three.
//
// Usage: npm run bump-version -- 1.1.0

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Usage: npm run bump-version -- <major.minor.patch>');
  process.exit(1);
}

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const pkgPath = path.join(rootDir, 'package.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

function updateJsonVersion(filePath) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  const oldVersion = json.version;
  json.version = newVersion;
  writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  return oldVersion;
}

function updateCargoTomlVersion(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const match = original.match(/^version = "(.*)"$/m);
  if (!match) {
    console.error(`Could not find a "version = ..." line in ${filePath}`);
    process.exit(1);
  }
  const updated = original.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
  writeFileSync(filePath, updated);
  return match[1];
}

const oldPkgVersion = updateJsonVersion(pkgPath);
updateCargoTomlVersion(cargoTomlPath);
updateJsonVersion(tauriConfPath);

console.log(`Bumped version: ${oldPkgVersion} -> ${newVersion}`);
console.log('Updated package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json');

function tryRun(command, cwd) {
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch {
    console.warn(`Warning: "${command}" failed — run it manually before committing.`);
  }
}

console.log('\nRefreshing lockfiles...');
tryRun('npm install', rootDir);
tryRun('cargo check', path.join(rootDir, 'src-tauri'));

console.log(`
Next steps:
  git diff                                   # review the changes
  git add -A
  git commit -m "Bump version to ${newVersion}"
  git tag v${newVersion}
  git push origin <branch> && git push origin v${newVersion}
`);
