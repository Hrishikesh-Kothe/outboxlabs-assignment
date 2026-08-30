const KEY = "ong-stars";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function isStarred(id: string): boolean {
  return read().includes(id);
}

export function toggleStar(id: string): boolean {
  const current = new Set(read());
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  localStorage.setItem(KEY, JSON.stringify([...current]));
  return current.has(id);
}
