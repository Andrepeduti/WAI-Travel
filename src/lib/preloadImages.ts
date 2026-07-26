export const globalPreloadedImages = new Set<string>();

export async function preloadImages(urls: string[]) {
  const toLoad = urls.filter(u => u && !u.startsWith('blob:') && !globalPreloadedImages.has(u));
  if (toLoad.length > 0) {
    await Promise.all(
      toLoad.map(
        url =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              globalPreloadedImages.add(url);
              resolve();
            };
            img.onerror = () => {
              globalPreloadedImages.add(url);
              resolve();
            };
            img.src = url;
          })
      )
    );
  }
}
