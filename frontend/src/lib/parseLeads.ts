const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function parseLeadText(text: string): string[] {
  const unique = new Set<string>();
  for (const match of text.match(EMAIL_RE) ?? []) {
    unique.add(match.toLowerCase());
  }
  return [...unique];
}

export async function parseLeadFile(file: File): Promise<string[]> {
  const text = await file.text();
  return parseLeadText(text);
}
