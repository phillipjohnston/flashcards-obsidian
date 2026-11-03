# Flashcards

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/reuseman/flashcards-obsidian?style=for-the-badge&sort=semver)](https://github.com/reuseman/flashcards-obsidian/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/reuseman/flashcards-obsidian/total?style=for-the-badge)

![logo](logo.png)
Anki integration for [Obsidian](https://obsidian.md/).

## Features

🗃️ Simple flashcards with **#card**  
🔁 Overlapping cloze lists with **#card/overlap**  
🎴 Reversed flashcards with **#card-reverse** or **#card/reverse**  
📅 Spaced-only cards with **#card-spaced** or **#card/spaced**  
✍️ Inline style with **Question::Answer**  
✍️ Inline style reversed with **Question:::Answer**  
🧠 **Context-aware** mode  
🏷️ Global and local **tags**  
🔢 Support for **LaTeX**  
🖼️ Support for **images**  
🎤 Support for **audios**  
🔗 Support for **Obsidian URI**  
⚓ Support for **reference to note**  
📟 Support for **code syntax highlight**

## Overlapping cloze cards

Enumerations can be written as a title tagged `#<tag>/overlap` (or `#<tag>-overlap`) followed by a list. Each list item becomes one cloze in an overlapping cloze note:

```markdown
- Three Times #anki/overlap
	1. Past
	2. Present
	3. Future
```

- The Anki note type must already exist (default: `Cloze (Modern Overlapping)`, with fields `Text`, `Back Extra`, `Before|After|OnlyContext|RevealAll|InactiveHints`). Change the name in settings if yours differs.
- The title can be a list item (items must be nested under it), a heading, or a plain line.
- Ordered lists keep their numbers in the card; bulleted lists do not.
- The Anki ID is written at the end of the title line (`^1234567890123`).
- The Obsidian source link goes in `Back Extra` when source support is enabled.

Overlap settings (`Before,After,OnlyContext,RevealAll,InactiveHints`) layer from lowest to highest priority:

1. Plugin setting "Default overlap settings" (default `3,0,false,true,false`)
2. `cards-overlap: 2,1` in a note's frontmatter
3. `%%overlap: 2,1%%` on the card's title line, before the ID

Partial values fill from the left (`2` sets only Before).

A `{{c99::ask-all}}` cloze is appended by default (setting "Add ask-all card"). Turn it off or on for a note or card with `no-ask-all` / `ask-all` in either override, e.g. `%%overlap: no-ask-all%%` or `cards-overlap: 2,0 no-ask-all`. The card beats the note, which beats the setting.

## How it works?

The following is a demo where the three main operations are shown:

1. **Insertion** of cards;
2. **Update** of cards;
3. **Deletion** of cards.

![Demo image](docs/demo.gif)

## How to use it?

The wiki explains in detail [how to use it](https://github.com/reuseman/flashcards-obsidian/wiki).

## How to Build

```
npm install
npm run dev
```

  You can now run:
  - npm run lint - Check code quality
  - npm run format - Format code with Prettier
  - npm run build - Build the plugin


## How to install

1. [Install](obsidian://show-plugin?id=flashcards-obsidian) this plugin on Obsidian:
   - Open Settings > Community plugins
   - Make sure Safe mode is off
   - Click Browse community plugins
   - Search for "**Flashcards**"
   - Click Install
   - Once installed, close the community plugins window and activate the newly installed plugin

2. Install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) on Anki
   - Tools > Add-ons -> Get Add-ons...
   - Paste the code **2055492159** > Ok
   - Select the plugin > Config > Paste the configuration below

3. Open the settings of the plugin, and while Anki is opened press "**Grant Permission**"
