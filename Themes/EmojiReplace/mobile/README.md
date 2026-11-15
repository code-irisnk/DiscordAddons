# EmojiReplace for mobile (Vendetta / Bunny / Revenge)

Mobile port of the EmojiReplace CSS theme. CSS can't run in the React Native app, so this is a plugin that
rewrites Discord's bundled emoji images (`asset:/emoji-<hex>.png`) to the Google 3D PNGs in `../emojis/Google/`,
loaded from GitHub Pages.

## Install

Paste this into the Plugins page of your client:

```
https://code-irisnk.github.io/DiscordAddons/Themes/EmojiReplace/mobile/dist/
```

## Build (after changing emojis or the template)

```sh
npm install
npm run build        # writes dist/manifest.json and dist/index.js; commit dist/
```

`dist/` and `../emojis/` must both be pushed to the branch GitHub Pages serves.

## Limits

- Only covers emoji Discord draws as images (messages, reactions, picker). Emoji typed into plain text
  fields or shown as system text are not replaced.
- Only the Google set exists in `../emojis/`. `npm run build -- <Provider>` builds another provider folder once added.
- The client must be Vendetta-API based (Vendetta, Bunny, Kettu, old Revenge). The newer Revenge plugin format is different.
