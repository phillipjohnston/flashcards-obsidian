# Flashcards

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/reuseman/flashcards-obsidian?style=for-the-badge&sort=semver)](https://github.com/reuseman/flashcards-obsidian/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/reuseman/flashcards-obsidian/total?style=for-the-badge)

![logo](logo.png)
Anki integration for [Obsidian](https://obsidian.md/).

## Features

🗃️ Simple flashcards with **#card**  
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
