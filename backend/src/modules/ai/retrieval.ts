const stop = new Set(
  "a an the is are was were i me my you your we our it this that to of in on at for with and or do does how what where when can should buk campus please tell about".split(
    " ",
  ),
);
export function tokens(text: string) {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter((t) => t.length > 2 && !stop.has(t))
        .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t)),
    ),
  ];
}
export function chunks(text: string, size = 1400) {
  const result: string[] = [];
  for (let i = 0; i < text.length; i += size - 180)
    result.push(text.slice(i, i + size));
  return result;
}
export function rank<T extends { title: string; body: string }>(
  query: string,
  rows: T[],
) {
  const words = tokens(query);
  return rows
    .map((row) => {
      const title = tokens(row.title),
        body = tokens(row.body);
      const matched = words.filter(
        (w) => title.includes(w) || body.includes(w),
      );
      return {
        row,
        score: matched.reduce((s, w) => s + (title.includes(w) ? 3 : 1), 0),
        coverage: matched.length / Math.max(1, words.length),
      };
    })
    .filter((r) => r.score > 0 && r.coverage >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.row);
}
