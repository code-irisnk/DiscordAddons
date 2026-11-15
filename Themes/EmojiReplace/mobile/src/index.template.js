(function () {
    // EmojiReplace (mobile): rewrites Discord's bundled emoji images (asset:/emoji-<hex>.png)
    // to the Google 3D PNGs hosted next to the desktop theme.
    // Built by scripts/build.mjs, which fills in the base URL and emoji map below.
    const { ReactNative: RN } = vendetta.metro.common;
    const { before } = vendetta.patcher;

    const BASE = "__BASE__";
    // "<hex>-<hex>" (fe0f removed) -> "<category>/<name>.png"
    const MAP = __MAP__;

    const PREFIX = "asset:/emoji-";

    function lookup(uri) {
        const hex = uri.slice(PREFIX.length).replace(/\.png$/i, "").toLowerCase().replace(/_/g, "-");
        const key = hex.split("-").filter(p => p !== "fe0f").join("-");
        return MAP[key];
    }

    let unpatch;

    return {
        onLoad() {
            unpatch = before("Image", RN, args => {
                const props = args[0];
                const uri = props?.source?.uri;
                if (typeof uri !== "string" || !uri.startsWith(PREFIX)) return;

                const file = lookup(uri);
                if (!file) return; // unknown emoji: keep Discord's own

                return [{ ...props, source: { ...props.source, uri: BASE + file } }, ...args.slice(1)];
            });
        },
        onUnload() {
            unpatch?.();
        },
    };
})()
