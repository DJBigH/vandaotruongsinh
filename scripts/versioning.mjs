export function nextGameVersion(current) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`Invalid game version: ${current}`);
  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  if (minor === 0 && patch === 9) return `${major + 1}.0.0`;
  if (patch >= 9) throw new Error('Version line requires a deliberate major release');
  return `${major}.${minor}.${patch + 1}`;
}
