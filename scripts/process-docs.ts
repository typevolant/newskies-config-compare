import { parse, HTMLElement } from 'node-html-parser';
import * as fs from 'fs';
import * as path from 'path';

// Types for processed documentation
interface DocMetadata {
  filename: string;
  title: string;
  breadcrumbs: string[];
  keywords: string[];
}

interface SettingsTable {
  headers: string[];
  rows: string[][];
}

type DocElement =
  | { type: 'text'; content: string }
  | { type: 'table'; table: SettingsTable };

interface ProcessedDoc {
  filename: string;
  title: string;
  breadcrumbs: string[];
  elements: DocElement[];
}

interface SearchIndexEntry {
  id: number;
  filename: string;
  title: string;
  content: string;
}

const DOCS_DIR = path.join(process.cwd(), 'docs');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'docs-processed');
const CONTENT_DIR = path.join(OUTPUT_DIR, 'content');

// Extract title from HTML
function extractTitle(root: HTMLElement): string {
  // Try <span id="pagetitle"> first
  const pageTitle = root.querySelector('#pagetitle');
  if (pageTitle) {
    return pageTitle.text.trim();
  }

  // Fall back to <title>
  const title = root.querySelector('title');
  if (title) {
    return title.text.trim();
  }

  return 'Untitled';
}

// Extract breadcrumbs from HTML
function extractBreadcrumbs(root: HTMLElement): string[] {
  const breadcrumbTable = root.querySelector('#pagetopbreadcrumbs');
  if (!breadcrumbTable) {
    return [];
  }

  const text = breadcrumbTable.text.trim();
  // Split by > and clean up
  return text.split('>')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Extract domain note from header (e.g., "This topic is for SYS domain users")
function extractDomainNote(root: HTMLElement): string | null {
  // Look for table rows in the pagetop area containing domain user text
  const pagetop = root.querySelector('#pagetop');
  if (!pagetop) {
    return null;
  }

  // Find spans with color:white style containing "This topic is for"
  const spans = pagetop.querySelectorAll('span');
  for (const span of spans) {
    const style = span.getAttribute('style') || '';
    const text = span.text.trim();
    if (style.includes('color:white') && text.startsWith('This topic is for')) {
      return text;
    }
  }

  return null;
}

// Extract all elements (text and tables) in document order
function extractElements(root: HTMLElement): DocElement[] {
  const mainBody = root.querySelector('#mainbody') || root.querySelector('#pagebody');
  if (!mainBody) {
    return [];
  }

  const elements: DocElement[] = [];
  const processedElements = new Set<HTMLElement>();
  let currentTextBlock: string[] = [];

  // Flush accumulated text as a single text element
  function flushText(): void {
    if (currentTextBlock.length > 0) {
      elements.push({ type: 'text', content: currentTextBlock.join('\n\n') });
      currentTextBlock = [];
    }
  }

  // Add a line to the current text block
  function addText(text: string): void {
    if (text) {
      currentTextBlock.push(text);
    }
  }

  // Process an element, adding to text block or flushing and adding table
  function processElement(element: HTMLElement): void {
    if (processedElements.has(element)) return;

    const tagName = element.tagName?.toLowerCase();

    // Skip if inside a table (will be processed by table extraction)
    if (isInsideTable(element, mainBody)) {
      return;
    }

    // Handle tables - flush text first, then add table
    if (tagName === 'table') {
      processedElements.add(element);
      const table = extractSingleTable(element);
      if (table && table.rows.length > 0) {
        flushText();
        elements.push({ type: 'table', table });
      }
      return;
    }

    // Handle ordered lists
    if (tagName === 'ol') {
      processedElements.add(element);
      const items = element.querySelectorAll(':scope > li');
      items.forEach((li, index) => {
        processedElements.add(li as HTMLElement);

        const nestedUl = li.querySelector(':scope > ul');
        if (nestedUl) {
          processedElements.add(nestedUl as HTMLElement);
          let mainText = '';
          for (const child of li.childNodes) {
            if (child instanceof HTMLElement) {
              if (child.tagName?.toLowerCase() === 'ul') break;
              mainText += ' ' + extractTextWithLinks(child);
            }
          }
          mainText = mainText.replace(/\s+/g, ' ').trim();

          let fullText = `${index + 1}. ${mainText}`;
          const nestedItems = nestedUl.querySelectorAll(':scope > li');
          nestedItems.forEach((nestedLi) => {
            processedElements.add(nestedLi as HTMLElement);
            const nestedText = extractTextWithLinks(nestedLi as HTMLElement);
            if (nestedText) {
              fullText += `\n   • ${nestedText}`;
            }
          });
          addText(fullText);
        } else {
          const text = extractTextWithLinks(li as HTMLElement);
          if (text) {
            addText(`${index + 1}. ${text}`);
          }
        }
      });
      return;
    }

    // Handle unordered lists
    if (tagName === 'ul') {
      if (isNestedInOrderedList(element, mainBody)) {
        return;
      }
      processedElements.add(element);

      // Check if this is a definition list - convert to table
      if (isDefinitionList(element)) {
        const defTable = extractDefinitionList(element);
        if (defTable && defTable.rows.length > 0) {
          flushText();
          elements.push({ type: 'table', table: defTable });
        }
        return;
      }

      const items = element.querySelectorAll(':scope > li');
      items.forEach((li) => {
        processedElements.add(li as HTMLElement);
        const text = extractTextWithLinks(li as HTMLElement);
        if (text) {
          addText(`• ${text}`);
        }
      });
      return;
    }

    // Skip li elements (handled by ol/ul processing above)
    if (tagName === 'li') {
      return;
    }

    // Handle paragraph-like elements
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      processedElements.add(element);
      const text = extractTextWithLinks(element);
      if (text) {
        if (tagName === 'h1') {
          addText(`# ${text}`);
        } else if (tagName === 'h2') {
          addText(`## ${text}`);
        } else if (tagName === 'h3') {
          addText(`### ${text}`);
        } else if (tagName === 'h4') {
          addText(`#### ${text}`);
        } else if (tagName === 'h5') {
          addText(`##### ${text}`);
        } else if (tagName === 'h6') {
          addText(`###### ${text}`);
        } else if (tagName === 'p' && element.classNames?.includes('Synopsis')) {
          // Treat Synopsis paragraphs as h3-style headers
          addText(`### ${text}`);
        } else {
          addText(text);
        }
      }
      return;
    }

    // Handle div/span with specific classes
    if ((tagName === 'div' || tagName === 'span') &&
        element.classNames &&
        /Body|Note|Important|Tip|Warning|Caution|Synopsis/.test(element.classNames)) {
      const parent = element.parentNode;
      if (parent instanceof HTMLElement && parent.tagName?.toLowerCase() === 'li') {
        return;
      }
      processedElements.add(element);
      const text = extractTextWithLinks(element);
      if (text) {
        addText(text);
      }
      return;
    }

    // Recurse into children for container elements
    for (const child of element.childNodes) {
      if (child instanceof HTMLElement) {
        processElement(child);
      }
    }
  }

  // Start processing from mainbody's children
  for (const child of mainBody.childNodes) {
    if (child instanceof HTMLElement) {
      processElement(child);
    }
  }

  // Flush any remaining text
  flushText();

  // Process "See Also" section if present (often outside mainbody)
  const seeAlsoSection = root.querySelector('#seealsoSection');
  if (seeAlsoSection) {
    const links = seeAlsoSection.querySelectorAll('a');
    if (links.length > 0) {
      const seeAlsoLinks: string[] = [];
      for (const link of links) {
        const href = link.getAttribute('href');
        const text = link.text.trim();
        if (href && text && href.endsWith('.html')) {
          const decodedHref = decodeURIComponent(href);
          seeAlsoLinks.push(`• [${text}](${decodedHref})`);
        }
      }
      if (seeAlsoLinks.length > 0) {
        elements.push({ type: 'text', content: seeAlsoLinks.join('\n\n') });
      }
    }
  }

  return elements;
}

// Check if a <ul> element is a definition list (most items start with bold terms)
function isDefinitionList(ul: HTMLElement): boolean {
  const listItems = ul.querySelectorAll(':scope > li');
  if (listItems.length < 3) return false;

  let boldCount = 0;
  for (const li of listItems) {
    const firstBold = li.querySelector('strong, b');
    if (firstBold) {
      const liText = li.text.trim();
      const boldText = firstBold.text.trim();
      if (liText.startsWith(boldText) || liText.indexOf(boldText) < 5) {
        boldCount++;
      }
    }
  }

  return boldCount >= listItems.length * 0.7;
}

// Check if a <ul> is nested inside an <ol> (sub-list of numbered list)
function isNestedInOrderedList(element: HTMLElement, container: HTMLElement): boolean {
  let parent = element.parentNode;
  while (parent && parent !== container) {
    if (parent instanceof HTMLElement) {
      const tag = parent.tagName?.toLowerCase();
      if (tag === 'ol') return true;
      if (tag === 'li') {
        // Check if this li is inside an ol
        const liParent = parent.parentNode;
        if (liParent instanceof HTMLElement && liParent.tagName?.toLowerCase() === 'ol') {
          return true;
        }
      }
    }
    parent = parent.parentNode;
  }
  return false;
}

// Check if an element is inside a table
function isInsideTable(element: HTMLElement, container: HTMLElement): boolean {
  let parent = element.parentNode;
  while (parent && parent !== container) {
    if (parent instanceof HTMLElement && parent.tagName?.toLowerCase() === 'table') {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}


// Extract text from an element, converting <a> tags to markdown-style links
function extractTextWithLinks(element: HTMLElement): string {
  let result = '';

  function processNode(node: Node): void {
    if (node.nodeType === 3) {
      // Text node
      result += (node as Text).textContent || '';
    } else if (node instanceof HTMLElement) {
      const tagName = node.tagName?.toLowerCase();

      if (tagName === 'a') {
        const href = node.getAttribute('href');
        const text = node.text.trim();
        if (href && text && href.endsWith('.html')) {
          // Convert to markdown-style link for internal docs
          // Decode URL-encoded characters like %20
          const decodedHref = decodeURIComponent(href);
          result += `[${text}](${decodedHref})`;
        } else if (text) {
          result += text;
        }
      } else if (tagName === 'br') {
        result += ' ';
      } else {
        // Process children
        for (const child of node.childNodes) {
          processNode(child);
        }
      }
    }
  }

  processNode(element);
  const cleaned = result.replace(/\s+/g, ' ').trim();
  return cleanMarkdownPatterns(cleaned);
}

// Clean up malformed markdown patterns in extracted text
// Converts **text** to <strong>text</strong> style emphasis markers
// and removes orphaned asterisks that don't form valid patterns
function cleanMarkdownPatterns(text: string): string {
  // First, handle valid **text** patterns - convert to emphasis
  // But skip patterns that look like masked data (e.g., ****1234 for account numbers)
  // or wildcards (e.g., *** for "all")
  let result = text;

  // Match **text** but not ***+ (wildcards) or ****digits (masked numbers)
  // Pattern: ** followed by non-asterisk content, followed by **
  result = result.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
    // Skip if this looks like part of a masked number pattern
    // e.g., "****5201" would have been split weirdly
    const trimmed = content.trim();
    if (!trimmed || trimmed.length === 0) {
      return match; // Keep as-is if empty
    }
    return `**${trimmed}**`; // Keep valid markdown bold
  });

  // Remove orphaned trailing ** that don't have a matching opening
  // Look for cases like "text**" at end of content without opening **
  result = result.replace(/([^*])\*\*$/g, '$1');

  // Remove orphaned ** in the middle of text (no matching pair)
  // This catches "some text** more text" where there's no opening
  result = result.replace(/([^*\s])\*\*(\s)/g, '$1$2');

  return result;
}

// Clean text within a table cell (preserve some structure)
function cleanCellText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/\s*\n\s*/g, ' ')  // Replace newlines with spaces
    .trim();
}

// Extract text from a table cell element, preserving links
function extractCellTextWithLinks(element: HTMLElement): string {
  return extractTextWithLinks(element);
}

// Extract a single table element
function extractSingleTable(table: HTMLElement): SettingsTable | null {
  const rows = table.querySelectorAll('tr');
  if (rows.length === 0) return null;

  const tableData: SettingsTable = {
    headers: [],
    rows: []
  };

  const firstRow = rows[0];
  const headerCells = firstRow.querySelectorAll('th');

  if (headerCells.length > 0) {
    // Standard table with <th> headers
    tableData.headers = headerCells.map(cell => cleanCellText(cell.text));

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length > 0) {
        tableData.rows.push(cells.map(cell => extractCellTextWithLinks(cell as HTMLElement)));
      }
    }
  } else {
    // No <th> elements - check for common patterns
    const firstRowCells = firstRow.querySelectorAll('td');

    if (firstRowCells.length === 2) {
      const firstCellHasBold = firstRow.querySelector('td b, td strong') !== null;

      if (firstCellHasBold && rows.length > 1) {
        tableData.headers = ['Setting', 'Description'];

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const nameCell = cells[0];
            const boldEl = nameCell.querySelector('b, strong');
            const settingName = boldEl ? cleanCellText(boldEl.text) : cleanCellText(nameCell.text);
            const descCell = cells[1];
            const description = extractCellTextWithLinks(descCell as HTMLElement);

            if (settingName || description) {
              tableData.rows.push([settingName, description]);
            }
          }
        }
      } else {
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            tableData.rows.push(cells.map(cell => extractCellTextWithLinks(cell as HTMLElement)));
          }
        }
      }
    } else if (firstRowCells.length > 0) {
      const firstCellText = firstRowCells[0].text.trim().toLowerCase();
      const looksLikeHeader = ['field', 'element', 'name', 'setting', 'option', 'parameter', 'property', 'value', 'type']
        .some(h => firstCellText.includes(h));

      if (looksLikeHeader && rows.length > 1) {
        tableData.headers = firstRowCells.map(cell => cleanCellText(cell.text));
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length > 0) {
            tableData.rows.push(cells.map(cell => extractCellTextWithLinks(cell as HTMLElement)));
          }
        }
      } else {
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            tableData.rows.push(cells.map(cell => extractCellTextWithLinks(cell as HTMLElement)));
          }
        }
      }
    }
  }

  return tableData.rows.length > 0 ? tableData : null;
}

// Extract a definition list (ul with bold terms) as a table
function extractDefinitionList(ul: HTMLElement): SettingsTable | null {
  const listItems = ul.querySelectorAll(':scope > li');
  if (listItems.length < 2) return null;

  const defTable: SettingsTable = {
    headers: ['Term', 'Description'],
    rows: []
  };

  for (const li of listItems) {
    const firstBold = li.querySelector('strong, b');
    if (firstBold) {
      const term = cleanCellText(firstBold.text);
      const fullText = extractCellTextWithLinks(li as HTMLElement);
      let description = fullText;
      if (fullText.startsWith(term)) {
        description = fullText.substring(term.length).trim();
        description = description.replace(/^[\s\-:]+/, '').trim();
      }

      if (term) {
        defTable.rows.push([term, description]);
      }
    } else {
      const text = extractCellTextWithLinks(li as HTMLElement);
      if (text) {
        defTable.rows.push([text, '']);
      }
    }
  }

  return defTable.rows.length > 0 ? defTable : null;
}

// Extract keywords from content for better search
function extractKeywords(title: string, breadcrumbs: string[], content: string): string[] {
  const keywords = new Set<string>();

  // Add title words
  title.toLowerCase().split(/\s+/).forEach(w => {
    if (w.length > 3) keywords.add(w);
  });

  // Add breadcrumb words
  breadcrumbs.forEach(b => {
    b.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 3) keywords.add(w);
    });
  });

  // Extract common settings-related terms
  const settingsTerms = content.match(/\b(setting|configuration|option|parameter|enable|disable|allow|restrict|permission|role|booking|flight|passenger|payment|fee|tax)\w*/gi);
  if (settingsTerms) {
    settingsTerms.forEach(t => keywords.add(t.toLowerCase()));
  }

  return Array.from(keywords).slice(0, 50);  // Limit keywords
}

// Pre-process HTML to convert markdown bold syntax to proper HTML
// This catches **text** patterns that weren't converted during original authoring
function preprocessHtml(html: string): string {
  // Convert **text** to <strong>text</strong>
  // But skip patterns that look like:
  // - Masked data: ****1234 (account numbers)
  // - Wildcards: *** or ** (meaning "all" or "any")
  // - Already inside HTML tags

  // Use a more careful regex that requires:
  // 1. The opening ** must not be preceded by another *
  // 2. The closing ** must not be followed by another *
  // 3. Content must be reasonable text (starts with letter, at least 3 chars)
  return html.replace(/(?<!\*)\*\*([a-zA-Z][^*<>]{2,}?)\*\*(?!\*)/g, (match, content) => {
    const trimmed = content.trim();
    // Skip if content looks like it might be part of a pattern
    // or is too short to be meaningful bold text
    if (!trimmed || trimmed.length < 3) {
      return match;
    }
    return `<strong>${content}</strong>`;
  });
}

// Process a single HTML file
function processFile(filename: string): ProcessedDoc | null {
  const filePath = path.join(DOCS_DIR, filename);

  try {
    let html = fs.readFileSync(filePath, 'utf-8');
    // Pre-process to convert any markdown bold to proper HTML
    html = preprocessHtml(html);
    const root = parse(html);

    const title = extractTitle(root);
    const breadcrumbs = extractBreadcrumbs(root);
    const domainNote = extractDomainNote(root);
    const elements = extractElements(root);

    // Prepend domain note as italicized text if present
    if (domainNote) {
      elements.unshift({ type: 'text', content: `*${domainNote}*` });
    }

    return {
      filename,
      title,
      breadcrumbs,
      elements
    };
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    return null;
  }
}

// Helper to extract plain text from elements for search indexing
function getTextContent(elements: DocElement[]): string {
  return elements
    .map(el => {
      if (el.type === 'text') {
        return el.content;
      } else {
        // For tables, join headers and cell content
        const headerText = el.table.headers.join(' ');
        const rowText = el.table.rows.map(row => row.join(' ')).join(' ');
        return `${headerText} ${rowText}`;
      }
    })
    .join(' ');
}

// Build FlexSearch-compatible index data
function buildSearchIndex(docs: ProcessedDoc[]): SearchIndexEntry[] {
  return docs.map((doc, index) => ({
    id: index,
    filename: doc.filename,
    title: doc.title,
    content: `${doc.title} ${doc.breadcrumbs.join(' ')} ${getTextContent(doc.elements)}`.substring(0, 5000)
  }));
}

// Main processing function
async function main() {
  console.log('Processing documentation files...');

  // Ensure output directories exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Get all HTML files
  const files = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html');

  console.log(`Found ${files.length} HTML files`);

  const processedDocs: ProcessedDoc[] = [];
  const metadata: DocMetadata[] = [];

  for (const file of files) {
    const doc = processFile(file);
    if (doc) {
      processedDocs.push(doc);
      const textContent = getTextContent(doc.elements);
      metadata.push({
        filename: doc.filename,
        title: doc.title,
        breadcrumbs: doc.breadcrumbs,
        keywords: extractKeywords(doc.title, doc.breadcrumbs, textContent)
      });

      // Write individual content file (for lazy loading)
      const contentFile = path.join(CONTENT_DIR, file.replace('.html', '.json'));
      fs.writeFileSync(contentFile, JSON.stringify({
        filename: doc.filename,
        title: doc.title,
        breadcrumbs: doc.breadcrumbs,
        elements: doc.elements
      }, null, 2));
    }
  }

  console.log(`Processed ${processedDocs.length} files`);

  // Build and write search index
  const searchIndex = buildSearchIndex(processedDocs);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2)
  );
  console.log('Created search-index.json');

  // Write metadata
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  console.log('Created metadata.json');

  // Parse and write table of contents from index.html
  const indexPath = path.join(DOCS_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    const indexRoot = parse(indexHtml);
    const links = indexRoot.querySelectorAll('a[href]');

    const toc = links
      .map(link => ({
        href: link.getAttribute('href') || '',
        title: link.text.trim()
      }))
      .filter(item => item.href.endsWith('.html') && item.title);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'toc.json'),
      JSON.stringify(toc, null, 2)
    );
    console.log('Created toc.json');
  }

  console.log('Documentation processing complete!');
  console.log(`Output written to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
