import { Card } from "src/entities/card";
import { substituteSep } from "src/utils";

export const overlapTextField = "Text";
export const overlapExtraField = "Back Extra";
export const overlapSettingsField =
  "Before|After|OnlyContext|RevealAll|InactiveHints";

/**
 * An overlapping cloze note, backed by an existing Anki note type
 * (e.g. "Cloze (Modern Overlapping)"). The note type is not created by this
 * plugin; it must already exist in Anki with the fields above.
 */
export class Overlapcard extends Card {
  constructor(
    id = -1,
    deckName: string,
    initialContent: string,
    fields: Record<string, string>,
    endOffset: number,
    tags: string[] = [],
    inserted = false,
    mediaNames: string[],
    modelName: string
  ) {
    super(
      id,
      deckName,
      initialContent,
      fields,
      false,
      endOffset,
      tags,
      inserted,
      mediaNames,
      false
    );
    this.modelName = modelName;
  }

  public getCard(update = false): object {
    const card: any = {
      deckName: this.deckName,
      modelName: this.modelName,
      fields: this.fields,
      tags: this.tags,
    };

    if (update) {
      card["id"] = this.id;
    }

    return card;
  }

  public getMedias(): object[] {
    const medias: object[] = [];
    this.mediaBase64Encoded.forEach((data, index) => {
      medias.push({
        filename: substituteSep(this.mediaNames[index]),
        data: data,
      });
    });

    return medias;
  }

  public toString = (): string => {
    return `Overlapping cloze: ${this.initialContent}`;
  };

  public getIdFormat(): string {
    // The ID goes at the end of the title line, so the list stays intact
    return " ^" + this.id.toString();
  }
}

const defaultOverlapSpec = ["3", "0", "false", "true", "false"];

/**
 * Normalize an overlap spec into the 5-value string the note type expects.
 * Accepts partial specs ("2" or "2,1"); missing positions fall back to `base`.
 * Tokens other than the 5 positional values (e.g. "ask-all") are ignored here.
 */
export function normalizeOverlapSpec(
  spec: string | undefined,
  base: string = defaultOverlapSpec.join(",")
): string {
  const baseParts = base.split(",").map((s) => s.trim());
  const result = defaultOverlapSpec.map((d, i) =>
    baseParts[i] !== undefined && baseParts[i] !== "" ? baseParts[i] : d
  );
  if (!spec) return result.join(",");

  const parts = String(spec)
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "" && !/^(no-?)?ask-?all$/i.test(s));
  parts.slice(0, 5).forEach((p, i) => {
    const valid = i < 2 ? /^\d+$/.test(p) : /^(true|false)$/i.test(p);
    if (valid) result[i] = p.toLowerCase();
  });
  return result.join(",");
}

/**
 * Resolve the ask-all flag from a spec: `ask-all` turns it on, `no-ask-all`
 * turns it off, otherwise `fallback` is returned.
 */
export function specAskAll(
  spec: string | undefined,
  fallback: boolean
): boolean {
  if (!spec) return fallback;
  const s = String(spec);
  if (/(^|[,\s])no-?ask-?all($|[,\s])/i.test(s)) return false;
  if (/(^|[,\s])ask-?all($|[,\s])/i.test(s)) return true;
  return fallback;
}
