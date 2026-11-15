(function () {
    // EmojiReplace (mobile): rewrites Discord's bundled emoji images (asset:/emoji-<hex>.png)
    // to the Google 3D PNGs hosted next to the desktop theme.
    // Built by scripts/build.mjs, which fills in the base URL and emoji map below.
    const { ReactNative: RN } = vendetta.metro.common;
    const { before } = vendetta.patcher;

    const BASE = "__BASE__";
    const DEBUG = true; // temporary: toasts show which stage fails
    const stats = { calls: 0, emojiRows: 0, converted: 0, unmapped: 0, imageHits: 0 };
    function toast(msg) {
        if (!DEBUG) return;
        try { vendetta.ui.toasts.showToast("EmojiReplace: " + msg); } catch (e) { console.log("[EmojiReplace]", msg); }
    }
    // "<hex>-<hex>" (fe0f removed) -> "<category>/<name>.png"
    const MAP = __MAP__;

    const PREFIX = "asset:/emoji-";

    function lookup(uri) {
        const hex = uri.slice(PREFIX.length).replace(/\.png$/i, "").toLowerCase().replace(/_/g, "-");
        const key = hex.split("-").filter(p => p !== "fe0f").join("-");
        return MAP[key];
    }

    // Message content is drawn by a native chat view. JS hands it JSON rows through
    // updateRows, and unicode emoji arrive as {type:"emoji", surrogate}. Custom emoji rows
    // carry an image URL, so mapped unicode emoji are turned into those.
    function getNativeModule(...names) {
        for (const name of names) {
            const m = globalThis.__turboModuleProxy?.(name) ?? globalThis.nativeModuleProxy?.[name];
            if (m) return m;
        }
    }

    function urlForSurrogate(surrogate) {
        const key = Array.from(surrogate, c => c.codePointAt(0).toString(16))
            .filter(p => p !== "fe0f").join("-");
        const file = MAP[key];
        return file && BASE + file;
    }

    function convertRows(rows) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || typeof row !== "object") continue;
            if (row.type === "emoji") {
                stats.emojiRows++;
                const src = typeof row.surrogate === "string" ? urlForSurrogate(row.surrogate) : undefined;
                if (!src) stats.unmapped++;
                if (src) {
                    stats.converted++;
                    rows[i] = { type: "customEmoji", id: "0", alt: row.surrogate, src, frozenSrc: src, jumboable: row.jumboable };
                }
                continue;
            }
            if (Array.isArray(row.content)) convertRows(row.content);
            if (Array.isArray(row.items)) convertRows(row.items);
        }
    }

    let unpatch;
    let unpatchRows;

    return {
        onLoad() {
            const chat = getNativeModule("NativeChatModule", "DCDChatManager");
            toast(chat?.updateRows ? "chat module found" : "chat module NOT found");
            if (chat?.updateRows) {
                unpatchRows = before("updateRows", chat, args => {
                    try {
                        stats.calls++;
                        const rows = JSON.parse(args[1]);
                        for (const row of rows) {
                            if (row?.type === 1 && Array.isArray(row.message?.content)) convertRows(row.message.content);
                        }
                        args[1] = JSON.stringify(rows);
                        if (stats.emojiRows && (stats.calls <= 3 || stats.converted === 1)) toast(`rows ${stats.calls}, emoji ${stats.emojiRows}, converted ${stats.converted}, unmapped ${stats.unmapped}`);
                    } catch (e) {
                        toast("row patch error: " + (e && e.message));
                        console.error("[EmojiReplace] row patch failed", e);
                    }
                });
            } else {
                console.warn("[EmojiReplace] native chat module not found; message emoji not replaced");
            }

            unpatch = before("Image", RN, args => {
                const props = args[0];
                const uri = props?.source?.uri;
                if (typeof uri !== "string" || !uri.startsWith(PREFIX)) return;

                const file = lookup(uri);
                if (!file) return; // unknown emoji: keep Discord's own
                if (++stats.imageHits === 1) toast("Image patch hit");

                return [{ ...props, source: { ...props.source, uri: BASE + file } }, ...args.slice(1)];
            });
        },
        onUnload() {
            unpatch?.();
            unpatchRows?.();
        },
    };
})()
