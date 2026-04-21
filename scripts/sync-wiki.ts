import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const WIKI_JSON_PATH = path.join(os.homedir(), 'Downloads/wiki.json');
const WIKI_FILES_DIR = path.join(os.homedir(), 'Downloads/wiki');
const DOCS_DIR = path.join(process.cwd(), 'docs');
const GITHUB_REPO_URL = 'https://github.com/lazyxiang/AutoWiki';

interface WikiPage {
  title: string;
  parent?: string;
  purpose?: string;
}

async function sync() {
  const data = await fs.readJson(WIKI_JSON_PATH);
  const pages: WikiPage[] = data.pages;

  // Clear docs dir
  await fs.emptyDir(DOCS_DIR);

  // Build tree and keep track of original order
  const tree = new Map<string, string[]>();
  const rootPages: string[] = [];
  
  pages.forEach(p => {
    if (p.parent) {
      const children = tree.get(p.parent) || [];
      children.push(p.title);
      tree.set(p.parent, children);
    } else {
      rootPages.push(p.title);
    }
  });

  // Helper to slugify title to filename
  const slugify = (t: string) => t.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]+/g, '').replace(/^-+|-+$/g, '');

  // Helper to find source file
  const findSource = (title: string) => {
    const slug = slugify(title);
    const files = fs.readdirSync(WIKI_FILES_DIR);
    const exact = files.find(f => f.replace('.md', '') === title);
    if (exact) return exact;
    return files.find(f => slugify(f.replace('.md', '')) === slug);
  };

  // Helper to transform content (fix links and add source links)
  const transformContent = (content: string) => {
    // 1. Fix internal markdown links
    let transformed = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, link) => {
      if (!link.startsWith('http') && !link.startsWith('#') && !link.endsWith('.md')) {
        return `[${text}](${link}.md)`;
      }
      return match;
    });

    // 2. Add source links for "Source: path/to/file.py:line-range"
    // Handle patterns like "Source: worker/jobs.py:66-240, shared/database.py:26-33"
    transformed = transformed.replace(/Source:\s*([^\n]+)/g, (match, sourceList) => {
      const links = sourceList.split(',').map((s: string) => {
        const trimmed = s.trim();
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          const filePath = parts[0];
          const lineRange = parts[1];
          const anchor = lineRange ? `#L${lineRange.replace('-', '-L')}` : '';
          return `[${trimmed}](${GITHUB_REPO_URL}/blob/main/${filePath}${anchor})`;
        }
        return trimmed;
      });
      return `Source: ${links.join(', ')}`;
    });

    return transformed;
  };

  // Recursive function to place files
  const processPage = async (title: string, currentPath: string, position: number) => {
    const slug = slugify(title);
    const sourceFile = findSource(title);
    if (!sourceFile) {
      console.warn(`Warning: Source file not found for "${title}"`);
      return;
    }

    const sourcePath = path.join(WIKI_FILES_DIR, sourceFile);
    const hasChildren = tree.has(title);
    let content = await fs.readFile(sourcePath, 'utf-8');
    content = transformContent(content);

    // Add sidebar_position to frontmatter
    if (content.startsWith('---')) {
      content = content.replace(/^---/, `---\nsidebar_position: ${position}`);
    } else {
      content = `---\nsidebar_position: ${position}\n---\n\n${content}`;
    }

    if (hasChildren) {
      const dirPath = path.join(currentPath, slug);
      await fs.ensureDir(dirPath);
      
      // Category index
      await fs.writeFile(path.join(dirPath, 'index.md'), content);
      
      // _category_.json with position
      await fs.writeJson(path.join(dirPath, '_category_.json'), {
        label: title,
        position: position,
        link: { type: 'doc', id: path.join(path.relative(DOCS_DIR, dirPath), 'index') }
      }, { spaces: 2 });

      // Process children in their original order from wiki.json
      const children = tree.get(title) || [];
      for (let i = 0; i < children.length; i++) {
        await processPage(children[i], dirPath, i + 1);
      }
    } else {
      await fs.writeFile(path.join(currentPath, `${slug}.md`), content);
    }
  };

  // Process root pages in their original order
  for (let i = 0; i < rootPages.length; i++) {
    await processPage(rootPages[i], DOCS_DIR, i + 1);
  }

  console.log('Wiki sync with ordering and source links complete!');
}

sync().catch(console.error);
