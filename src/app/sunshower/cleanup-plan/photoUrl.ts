// iNaturalist serves the same photo at several sizes on a fixed path:
//   .../photos/{id}/square.jpg     (75px)
//   .../photos/{id}/small.jpg      (240px)
//   .../photos/{id}/medium.jpg     (500px)
//   .../photos/{id}/large.jpg      (1024px)  ← what plants.json stores
//   .../photos/{id}/original.jpg
// Thumbnails render at 24–160px, so swapping to /medium./ is ~4–5× less
// payload per image and turns scroll-time loads from 700KB+ to ~80KB.
// The lightbox keeps using `large` (the original photo.url).

export function thumbUrl(url: string): string {
  return url.replace('/large.', '/medium.')
}
