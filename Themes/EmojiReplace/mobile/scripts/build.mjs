// Builds dist/{manifest.json,index.js}, the files a Vendetta/Bunny/Revenge client loads from a plugin URL.
// Maps emoji codepoints (as Discord names its bundled emoji) to ../emojis/<Provider>/<category>/<name>.png.
// Codepoints come from `discord-emoji` (Discord's own shortcodes) with `emoji-datasource` as fallback for newer emoji.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const discordEmoji = require('discord-emoji')
const datasource = require('emoji-datasource/emoji.json')

const here = dirname(fileURLToPath(import.meta.url))
const provider = process.argv[2] ?? 'Google'
const emojiRoot = join(here, '..', '..', 'emojis', provider)
const dist = join(here, '..', 'dist')
const BASE = `https://code-irisnk.github.io/DiscordAddons/Themes/EmojiReplace/emojis/${provider}/`

const TONES = { 1: '1f3fb', 2: '1f3fc', 3: '1f3fd', 4: '1f3fe', 5: '1f3ff' }
const toCodepoints = str => [...str].map(c => c.codePointAt(0).toString(16))

const fallback = new Map()
for (const e of datasource) for (const s of e.short_names) fallback.set(s.replaceAll('-', '_'), e.unified.toLowerCase().split('-'))

function resolve(category, name) {
    const direct = discordEmoji[category]?.[name]
    if (direct) return toCodepoints(direct)
    const tone = name.match(/_tone([1-5])$/)
    const base = fallback.get(name.replace(/_tone\d$/, ''))
    if (!base) return null
    return tone ? [...base.filter(c => c !== 'fe0f'), TONES[tone[1]]] : base
}

const map = {}
const unresolved = []
for (const category of readdirSync(emojiRoot)) {
    for (const file of readdirSync(join(emojiRoot, category))) {
        if (!file.endsWith('.png')) continue
        const cps = resolve(category, file.slice(0, -4))
        if (!cps) { unresolved.push(`${category}/${file}`); continue }
        const key = cps.filter(c => c !== 'fe0f').join('-')
        map[key] ??= `${category}/${file}` // duplicates are aliases of the same emoji
    }
}

const code = readFileSync(join(here, '..', 'src', 'index.template.js'), 'utf8')
    .replace('__BASE__', BASE)
    .replace('__MAP__', JSON.stringify(map))

mkdirSync(dist, { recursive: true })
writeFileSync(join(dist, 'index.js'), code)
writeFileSync(join(dist, 'manifest.json'), JSON.stringify({
    name: `EmojiReplace (${provider})`,
    description: `Replaces Discord's emoji with ${provider}'s emoji. Mobile port of the EmojiReplace theme.`,
    authors: [{ name: 'Iris Nkrichronos' }],
    main: 'index.js',
    hash: createHash('sha256').update(code).digest('hex'),
    vendetta: { icon: 'SuperReactionIcon' },
}, null, 4) + '\n')

console.log(`${Object.keys(map).length} emoji mapped; index.js ${(code.length / 1024).toFixed(0)} KB`)
if (unresolved.length) { console.error(`Unresolved (${unresolved.length}): ${unresolved.join(', ')}`); process.exitCode = 1 }
