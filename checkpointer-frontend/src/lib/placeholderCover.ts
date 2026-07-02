// Inline placeholder for games with no cover art. Kept as a data URI (not a
// /public asset) so it paints synchronously with the card and never triggers a
// network request. The unfingerprinted /bitmap.svg was served with
// `Cache-Control: no-cache`, forcing a revalidation round-trip on every render
// while real IGDB covers loaded instantly from CDN cache — making the
// placeholder the slowest image on the page.
const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='720' viewBox='0 0 720 720'><rect fill='#000000' width='360' height='360' x='360' y='0'/><rect fill='#000000' width='360' height='360' x='0' y='360'/><rect fill='#fff4ca' width='360' height='360' x='0' y='0'/><rect fill='#fff4ca' width='360' height='360' x='360' y='360'/></svg>`

export const PLACEHOLDER_COVER = `data:image/svg+xml,${encodeURIComponent(svg)}`
