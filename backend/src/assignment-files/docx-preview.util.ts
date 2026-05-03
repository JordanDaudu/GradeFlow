import * as mammoth from 'mammoth';

const PAGE_STYLES = `
  :root { color-scheme: light dark; }
  html, body {
    margin: 0;
    padding: 0;
    background: #f5f5f7;
    color: #1a1a1a;
    font-family: -apple-system, "Segoe UI", "Helvetica Neue", "Arial",
      "Noto Sans Hebrew", "Arial Hebrew", sans-serif;
    line-height: 1.6;
    font-size: 16px;
  }
  @media (prefers-color-scheme: dark) {
    html, body { background: #1a1a1a; color: #e5e5e5; }
    .docx-page { background: #242424; box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
    a { color: #6ea8fe; }
    table, th, td { border-color: #3a3a3a; }
  }
  .docx-page {
    max-width: 820px;
    margin: 24px auto;
    padding: 56px 64px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
    border-radius: 6px;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
  .docx-page p { margin: 0 0 0.85em; }
  .docx-page h1, .docx-page h2, .docx-page h3,
  .docx-page h4, .docx-page h5, .docx-page h6 {
    margin: 1.4em 0 0.6em;
    line-height: 1.25;
  }
  .docx-page h1 { font-size: 1.9em; }
  .docx-page h2 { font-size: 1.55em; }
  .docx-page h3 { font-size: 1.3em; }
  .docx-page ul, .docx-page ol { padding-inline-start: 1.6em; margin: 0 0 1em; }
  .docx-page li { margin-bottom: 0.3em; }
  .docx-page table {
    border-collapse: collapse;
    margin: 1em 0;
    max-width: 100%;
  }
  .docx-page table, .docx-page th, .docx-page td {
    border: 1px solid #d4d4d8;
  }
  .docx-page th, .docx-page td {
    padding: 6px 10px;
    vertical-align: top;
    text-align: start;
  }
  .docx-page img { max-width: 100%; height: auto; }
  .docx-page a { color: #1d4ed8; }
  .docx-page blockquote {
    margin: 1em 0;
    padding: 0.4em 1em;
    border-inline-start: 3px solid #d4d4d8;
    color: inherit;
    opacity: 0.85;
  }
  @media (max-width: 700px) {
    .docx-page { margin: 0; border-radius: 0; padding: 24px 18px; box-shadow: none; }
  }
`;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectDir(html: string): 'rtl' | 'ltr' {
  // If the HTML contains any Hebrew/Arabic letters, render RTL by default so
  // the layout matches the rest of the (Hebrew) UI.
  if (/[\u0590-\u05FF\u0600-\u06FF]/.test(html)) return 'rtl';
  return 'ltr';
}

export async function renderDocxBufferToHtml(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const { value } = await mammoth.convertToHtml(
    { buffer },
    {
      // Convert embedded images to inline data URIs so the preview is
      // self-contained and doesn't need a second round-trip.
      convertImage: mammoth.images.imgElement(async (image) => {
        const imgBuffer = await image.read('base64');
        return { src: `data:${image.contentType};base64,${imgBuffer}` };
      }),
    },
  );

  const dir = detectDir(value);
  return `<!doctype html>
<html lang="he" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(fileName)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<article class="docx-page">${value}</article>
</body>
</html>`;
}

export async function streamToBuffer(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

export function isDocxByName(name: string | null | undefined): boolean {
  return (name ?? '').toLowerCase().endsWith('.docx');
}

export function isDocxByContentType(
  contentType: string | null | undefined,
): boolean {
  return (
    (contentType ?? '').toLowerCase() ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}
