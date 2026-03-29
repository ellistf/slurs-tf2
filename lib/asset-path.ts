export function getAssetPath(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${trimmed}`;
}
