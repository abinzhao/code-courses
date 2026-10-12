export function validateClip(value) {
  if (!value || typeof value.url !== 'string' ||
      typeof value.title !== 'string' || typeof value.text !== 'string') return null;
  try {
    const url = new URL(value.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return {
      url: url.href,
      title: value.title.trim().slice(0, 200),
      text: value.text.slice(0, 2000),
    };
  } catch {
    return null;
  }
}
