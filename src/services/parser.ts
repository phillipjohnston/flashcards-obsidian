import { ISettings } from "src/settings";
import * as showdown from "showdown";
import { Regex } from "src/regex";
import { Flashcard } from "../entities/flashcard";
import { Inlinecard } from "src/entities/inlinecard";
import { Spacedcard } from "src/entities/spacedcard";
import {
  Overlapcard,
  normalizeOverlapSpec,
  overlapExtraField,
  overlapSettingsField,
  overlapTextField,
  specAskAll,
} from "src/entities/overlapcard";
import { escapeMarkdown, substituteSep } from "src/utils";
import { Card } from "src/entities/card";

export class Parser {
  private regex: Regex;
  private settings: ISettings;
  private htmlConverter;

  constructor(regex: Regex, settings: ISettings) {
    this.regex = regex;
    this.settings = settings;
    this.htmlConverter = new showdown.Converter();
    this.htmlConverter.setOption("simplifiedAutoLink", true);
    this.htmlConverter.setOption("tables", true);
    this.htmlConverter.setOption("tasks", true);
    this.htmlConverter.setOption("strikethrough", true);
    this.htmlConverter.setOption("ghCodeBlocks", true);
    this.htmlConverter.setOption("requireSpaceBeforeHeadingText", true);
    this.htmlConverter.setOption("simpleLineBreaks", true);
  }

  public generateFlashcards(
    file: string,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = [],
    overlapSpec: string = undefined
  ): Flashcard[] {
    const contextAware = this.settings.contextAwareMode;
    let cards: Flashcard[] = [];
    let headings: any = [];

    if (contextAware) {
      // https://regex101.com/r/agSp9X/4
      headings = [...file.matchAll(this.regex.headingsRegex)];
    }

    // filter  in cacheCodeSections only the objects with type "code"
    // the line is 0-indexed
    // const codeSections = this.app.metadataCache.getFileCache(this.app.workspace.getActiveFile()).sections.filter(section => section.type === "code")

    note = this.substituteObsidianLinks(`[[${note}]]`, vault);
    cards = cards.concat(
      this.generateCardsWithTag(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateInlineCards(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateSpacedCards(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateOverlapCards(
        file,
        headings,
        deck,
        vault,
        note,
        globalTags,
        overlapSpec
      )
    );
    cards.sort((a, b) => a.endOffset - b.endOffset);

    const defaultAnkiTag = this.settings.defaultAnkiTag;
    if (defaultAnkiTag) {
      for (const card of cards) {
        card.tags.push(defaultAnkiTag);
      }
    }

    return cards;
  }

  /**
   * Gives back the ancestor headings of a line.
   * @param headings The list of all the headings available in a file.
   * @param line The line whose ancestors need to be calculated.
   * @param headingLevel The level of the first ancestor heading, i.e. the number of #.
   */
  private getContext(
    headings: any,
    index: number,
    headingLevel: number
  ): string[] {
    const context: string[] = [];
    let currentIndex: number = index;
    let goalLevel = 6;

    let i = headings.length - 1;
    // Get the level of the first heading before the index (i.e. above the current line)
    if (headingLevel !== -1) {
      // This is the case of a #flashcard in a heading
      goalLevel = headingLevel - 1;
    } else {
      // Find first heading and its level
      // This is the case of a #flashcard in a paragraph
      for (i; i >= 0; i--) {
        if (headings[i].index < currentIndex) {
          currentIndex = headings[i].index;
          goalLevel = headings[i][1].length - 1;

          context.unshift(headings[i][2].trim());
          break;
        }
      }
    }

    // Search for the other headings
    for (i; i >= 0; i--) {
      const currentLevel = headings[i][1].length;
      if (currentLevel == goalLevel && headings[i].index < currentIndex) {
        currentIndex = headings[i].index;
        goalLevel = currentLevel - 1;

        context.unshift(headings[i][2].trim());
      }
    }

    return context;
  }

  private generateSpacedCards(
    file: string,
    headings: any,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ) {
    const contextAware = this.settings.contextAwareMode;
    const cards: Spacedcard[] = [];
    const matches = [...file.matchAll(this.regex.cardsSpacedStyle)];

    for (const match of matches) {
      const reversed = false;
      let headingLevel = -1;
      if (match[1]) {
        headingLevel =
          match[1].trim().length !== 0 ? match[1].trim().length : -1;
      }
      // Match.index - 1 because otherwise in the context there will be even match[1], i.e. the question itself
      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : "";

      const originalPrompt = match[2].trim();
      let prompt = contextAware
        ? [...context, match[2].trim()].join(
            `${this.settings.contextSeparator}`
          )
        : match[2].trim();
      let medias: string[] = this.getImageLinks(prompt);
      medias = medias.concat(this.getAudioLinks(prompt));
      prompt = this.parseLine(prompt, vault);

      const endingLine = match.index + match[0].length;
      const tags: string[] = this.parseTags(match[4], globalTags);
      const id: number = match[5] ? Number(match[5]) : -1;
      const inserted: boolean = match[5] ? true : false;
      const fields: any = { Prompt: prompt };
      if (this.settings.sourceSupport) {
        fields["Source"] = note;
      }
      const containsCode = this.containsCode([prompt]);

      const card = new Spacedcard(
        id,
        deck,
        originalPrompt,
        fields,
        reversed,
        endingLine,
        tags,
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }

    return cards;
  }

  private generateInlineCards(
    file: string,
    headings: any,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ) {
    const contextAware = this.settings.contextAwareMode;
    const cards: Inlinecard[] = [];
    const matches = [...file.matchAll(this.regex.cardsInlineStyle)];

    for (const match of matches) {
      if (
        match[2].toLowerCase().startsWith("cards-deck") ||
        match[2].toLowerCase().startsWith("tags")
      ) {
        continue;
      }

      const reversed: boolean =
        match[3] === this.settings.inlineSeparatorReverse;
      let headingLevel = -1;
      if (match[1]) {
        headingLevel =
          match[1].trim().length !== 0 ? match[1].trim().length : -1;
      }
      // Match.index - 1 because otherwise in the context there will be even match[1], i.e. the question itself
      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : "";

      const originalQuestion = match[2].trim();
      let question = contextAware
        ? [...context, match[2].trim()].join(
            `${this.settings.contextSeparator}`
          )
        : match[2].trim();
      let answer = match[4].trim();
      let medias: string[] = this.getImageLinks(question);
      medias = medias.concat(this.getImageLinks(answer));
      medias = medias.concat(this.getAudioLinks(answer));
      question = this.parseLine(question, vault);
      answer = this.parseLine(answer, vault);

      const endingLine = match.index + match[0].length;
      const tags: string[] = this.parseTags(match[5], globalTags);
      const id: number = match[6] ? Number(match[6]) : -1;
      const inserted: boolean = match[6] ? true : false;
      const fields: any = { Front: question, Back: answer };
      if (this.settings.sourceSupport) {
        fields["Source"] = note;
      }
      const containsCode = this.containsCode([question, answer]);

      const card = new Inlinecard(
        id,
        deck,
        originalQuestion,
        fields,
        reversed,
        endingLine,
        tags,
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }

    return cards;
  }

  private generateCardsWithTag(
    file: string,
    headings: any,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ) {
    const contextAware = this.settings.contextAwareMode;
    const cards: Flashcard[] = [];
    const matches = [...file.matchAll(this.regex.flashscardsWithTag)];

    for (const match of matches) {
      const reversed: boolean =
        match[3].trim().toLowerCase() ===
          `#${this.settings.flashcardsTag}-reverse` ||
        match[3].trim().toLowerCase() ===
          `#${this.settings.flashcardsTag}/reverse`;
      const headingLevel = match[1].trim().length !== 0 ? match[1].length : -1;
      // Match.index - 1 because otherwise in the context there will be even match[1], i.e. the question itself
      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : "";

      const originalQuestion = match[2].trim();
      let question = contextAware
        ? [...context, match[2].trim()].join(
            `${this.settings.contextSeparator}`
          )
        : match[2].trim();
      let answer = match[5].trim();
      let medias: string[] = this.getImageLinks(question);
      medias = medias.concat(this.getImageLinks(answer));
      medias = medias.concat(this.getAudioLinks(answer));
      question = this.parseLine(question, vault);
      answer = this.parseLine(answer, vault);

      const endingLine = match.index + match[0].length;
      const tags: string[] = this.parseTags(match[4], globalTags);
      const id: number = match[6] ? Number(match[6]) : -1;
      const inserted: boolean = match[6] ? true : false;
      const fields: any = { Front: question, Back: answer };
      if (this.settings.sourceSupport) {
        fields["Source"] = note;
      }
      const containsCode = this.containsCode([question, answer]);

      const card = new Flashcard(
        id,
        deck,
        originalQuestion,
        fields,
        reversed,
        endingLine,
        tags,
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }

    return cards;
  }

  /**
   * Overlapping cloze notes: a title line tagged #<tag>/overlap followed by a
   * list. Each list item becomes one cloze ({{c1::...}}, {{c2::...}}, ...).
   * The overlap settings come from (lowest to highest priority): plugin
   * settings, the `cards-overlap` frontmatter field, and an inline
   * `%%overlap: before,after,onlyContext,revealAll,inactiveHints%%` comment.
   * Partial specs are allowed ("2" or "2,1"). A {{c99::ask-all}} cloze is
   * appended when the overlapAskAll setting is on; `ask-all` / `no-ask-all`
   * in either spec overrides it (card beats note beats setting).
   */
  private generateOverlapCards(
    file: string,
    headings: any,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = [],
    noteSpec: string = undefined
  ) {
    const contextAware = this.settings.contextAwareMode;
    const cards: Overlapcard[] = [];
    const matches = [...file.matchAll(this.regex.cardsOverlapStyle)];
    const baseSpec = normalizeOverlapSpec(
      noteSpec,
      normalizeOverlapSpec(this.settings.overlapDefaults)
    );

    for (const match of matches) {
      const prefix = match[1] ?? "";
      const headerIndent = prefix
        .match(/^[ \t]*/)[0]
        .replace(/\t/g, "    ").length;
      const headerIsListItem = /[-+*]|\d+[.)]/.test(prefix.trim());
      const headingLevel = /^#+$/.test(prefix.trim())
        ? prefix.trim().length
        : -1;

      // Collect list items. When the title is itself a list item, the cloze
      // items must be nested beneath it; stop at the first sibling/outdent.
      const items: { text: string; ordered: boolean }[] = [];
      for (const line of match[7].split("\n")) {
        if (!line.trim()) continue;
        const m = line.match(/^([ \t]*)(\d+[.)]|[-+*])[ \t]+(.*)$/);
        if (!m) break;
        const indent = m[1].replace(/\t/g, "    ").length;
        if (headerIsListItem && indent <= headerIndent) break;
        items.push({ text: m[3].trim(), ordered: /\d/.test(m[2]) });
      }
      if (items.length === 0) continue;

      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : [];
      const originalTitle = match[2].trim();
      const title = contextAware
        ? [...context, originalTitle].join(this.settings.contextSeparator)
        : originalTitle;

      let medias: string[] = this.getImageLinks(title);
      const lines: string[] = [`<b>${this.parseInline(title, vault)}</b>`];
      items.forEach((item, i) => {
        medias = medias.concat(this.getImageLinks(item.text));
        medias = medias.concat(this.getAudioLinks(item.text));
        const prefixNum = item.ordered ? `${i + 1}. ` : "";
        lines.push(
          `${prefixNum}{{c${i + 1}::${this.parseInline(item.text, vault)}}}`
        );
      });
      const inlineSpec = match[4];
      const askAll = specAskAll(
        inlineSpec,
        specAskAll(noteSpec, this.settings.overlapAskAll ?? true)
      );
      if (askAll) {
        lines.push("{{c99::ask-all}}");
      }

      const fields: any = {
        [overlapTextField]: lines.join("<br>"),
        [overlapExtraField]: this.settings.sourceSupport ? note : "",
        [overlapSettingsField]: normalizeOverlapSpec(inlineSpec, baseSpec),
      };

      const tags: string[] = this.parseTags(match[3], globalTags);
      const id: number = match[6] ? Number(match[6]) : -1;
      const inserted = !!match[6];
      const endOffset =
        match.index + match[0].indexOf("\n") - this.headerTail(match);

      cards.push(
        new Overlapcard(
          id,
          deck,
          originalTitle,
          fields,
          endOffset,
          tags,
          inserted,
          medias,
          this.settings.overlapModelName
        )
      );
    }

    return cards;
  }

  /** Length of the header line after the ID insertion point (ID + trailing spaces). */
  private headerTail(match: RegExpMatchArray): number {
    const header = match[0].substring(0, match[0].indexOf("\n"));
    const beforeId = header.replace(/(?:[ \t]+\^\d{13})?[ \t]*$/, "");
    return header.length - beforeId.length;
  }

  /** parseLine without the wrapping <p> that showdown adds. */
  private parseInline(str: string, vault: string): string {
    return this.parseLine(str, vault)
      .trim()
      .replace(/^<p>([\s\S]*)<\/p>$/, "$1");
  }

  public containsCode(str: string[]): boolean {
    for (const s of str) {
      if (s.match(this.regex.codeBlock)) {
        return true;
      }
    }
    return false;
  }

  public getCardsToDelete(file: string): number[] {
    // Find block IDs with no content above it
    return [...file.matchAll(this.regex.cardsToDelete)].map((match) => {
      return Number(match[1]);
    });
  }

  private parseLine(str: string, vaultName: string) {
    return this.htmlConverter.makeHtml(
      this.mathToAnki(
        this.substituteObsidianLinks(
          this.substituteImageLinks(this.substituteAudioLinks(str)),
          vaultName
        )
      )
    );
  }

  private getImageLinks(str: string) {
    const wikiMatches = str.matchAll(this.regex.wikiImageLinks);
    const markdownMatches = str.matchAll(this.regex.markdownImageLinks);
    const links: string[] = [];

    for (const wikiMatch of wikiMatches) {
      links.push(wikiMatch[1]);
    }

    for (const markdownMatch of markdownMatches) {
      links.push(decodeURIComponent(markdownMatch[1]));
    }

    return links;
  }

  private getAudioLinks(str: string) {
    const wikiMatches = str.matchAll(this.regex.wikiAudioLinks);
    const links: string[] = [];

    for (const wikiMatch of wikiMatches) {
      links.push(wikiMatch[1]);
    }

    return links;
  }

  public updateCardSource(cards: Card[]) {
    for (const card of cards) {
      if (card.id == null) continue;
      for (const key of Object.keys(card.fields)) {
        if (typeof card.fields[key] === "string") {
          card.fields[key] = card.fields[key].replace(
            /__BLOCK_ID__/g,
            String(card.id)
          );
        }
      }
    }
  }

  private substituteObsidianLinks(str: string, vaultName: string) {
    const linkRegex = /\[\[(.+?)(?:\|(.+?))?\]\]/gim;
    vaultName = encodeURIComponent(vaultName);

    return str.replace(linkRegex, (match, filename, rename) => {
      const href = `obsidian://open?vault=${vaultName}&amp;file=${encodeURIComponent(
        filename + "#^__BLOCK_ID__"
      )}`;
      const fileRename = rename ? rename : filename;
      const link = `<a href="${href}">[[${fileRename}]]</a>`;
      return link;
    });
  }

  private substituteImageLinks(str: string): string {
    str = str.replace(this.regex.wikiImageLinks, "<img src='$1'>");
    str = str.replace(this.regex.markdownImageLinks, "<img src='$1'>");
    str = str.replace(this.regex.htmlImgTags, function (match) {
      return substituteSep(match);
    });

    return str;
  }

  private substituteAudioLinks(str: string): string {
    return str.replace(this.regex.wikiAudioLinks, "[sound:$1]");
  }

  private mathToAnki(str: string) {
    const mathBlockRegex = /(\$\$)(.*?)(\$\$)/gis;
    str = str.replace(mathBlockRegex, function (match, p1, p2) {
      return "\\\\[" + escapeMarkdown(p2) + " \\\\]";
    });

    const mathInlineRegex = /(\$)(.*?)(\$)/gi;
    str = str.replace(mathInlineRegex, function (match, p1, p2) {
      return "\\\\(" + escapeMarkdown(p2) + "\\\\)";
    });

    return str;
  }

  private parseTags(str: string, globalTags: string[]): string[] {
    const tags: string[] = [...globalTags];

    if (str) {
      for (const tag of str.split("#")) {
        let newTag = tag.trim();
        if (newTag) {
          // Replace obsidian hierarchy tags delimeter \ with anki delimeter ::
          newTag = newTag.replace(this.regex.tagHierarchy, "::");
          tags.push(newTag);
        }
      }
    }

    return tags;
  }

  public getAnkiIDsBlocks(file: string): RegExpMatchArray[] {
    return Array.from(file.matchAll(/\^(\d{13})\s*/gm));
  }
}
