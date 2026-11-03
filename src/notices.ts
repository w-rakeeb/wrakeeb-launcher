export function noticePages(text: string, limit = 14000): string[] {
  const pages: string[] = [];
  let current = "";
  for (const line of text.split(/(?<=\n)/)) { if (current && current.length + line.length > limit) { pages.push(current); current = ""; } current += line; }
  if (current) pages.push(current);
  return pages.length ? pages : [""];
}
