export function parseBulkFlashcards(
  raw: string
): Array<{ front: string; back: string }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.includes("|") ? "|" : line.includes("\t") ? "\t" : null;
      if (!sep) return null;
      const idx = line.indexOf(sep);
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + 1).trim();
      if (!front || !back) return null;
      return { front, back };
    })
    .filter((item): item is { front: string; back: string } => item !== null);
}

