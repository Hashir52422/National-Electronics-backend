// Simple, dependency-free slugify helper.
function slugify(text) {
  return String(text)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-word chars (keep letters, numbers, _, -, whitespace)
    .replace(/[\s_]+/g, '-') // collapse whitespace/underscores into hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

module.exports = slugify;
