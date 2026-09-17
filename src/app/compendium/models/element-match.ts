import { translateElementLabel } from './translator';

export function elemMatches(elem: string, alts: string[]): boolean {
  if (!elem) { return false; }

  const code = elem.toLocaleLowerCase();
  const label = translateElementLabel(elem, 'en').toLocaleLowerCase();

  return alts.some(alt =>
    alt.length > 1 && (code.startsWith(alt) || alt.startsWith(code) || label.includes(alt))
  );
}
