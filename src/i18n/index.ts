import { uz } from "./uz";
import { tk } from "./tk";
import type { Dictionary, Lang } from "./types";

export type { Dictionary, Lang };

export const dictionaries: Record<Lang, Dictionary> = {
  uz,
  tk,
};

export function getDictionary(lang?: string | null): Dictionary {
  return lang === "tk" ? tk : uz;
}

