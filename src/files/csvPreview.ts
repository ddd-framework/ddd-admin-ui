/** `;` (spreadsheet exports in many locales), tab or `,` — whichever splits the first line most. */
export const detectCsvDelimiter = (firstLine: string): string => {
  const candidates = [';', '\t', ','];
  return candidates.reduce((best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best));
};

/** A small RFC 4180 reader (quoted fields, doubled quotes, CRLF), enough for a preview; never evaluates anything. */
export const parseCsv = (text: string, maxRows = 100): string[][] => {
  const newline = text.indexOf('\n');
  const delimiter = detectCsvDelimiter(text.slice(0, newline === -1 ? text.length : newline));
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length && rows.length < maxRows; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if ((field !== '' || row.length > 0) && rows.length < maxRows) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};
