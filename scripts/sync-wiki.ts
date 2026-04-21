import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const WIKI_JSON_PATH = path.join(os.homedir(), 'Downloads/wiki.json');
const WIKI_FILES_DIR = path.join(os.homedir(), 'Downloads/wiki');
const DOCS_DIR = path.join(process.cwd(), 'docs');

interface WikiPage {
  title: string;
  parent?: string;
}

async function sync() {
  const data = await fs.readJson(WIKI_JSON_PATH);
  const pages: WikiPage[] = data.pages;

  // Clear docs dir
  await fs.emptyDir(DOCS_DIR);

  // Build tree
  const tree = new Map<string, string[]>();
  pages.forEach(p => {
    if (p.parent) {
      const children = tree.get(p.parent) || [];
      children.push(p.title);
      tree.set(p.parent, children);
    }
  });

  // Helper to slugify title to filename
  const slugify = (t: string) => t.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]+/g, '');

  // Helper to find source file
  const findSource = (title: string) => {
    const slug = slugify(title);
    const files = fs.readdirSync(WIKI_FILES_DIR);
    // Try exact match first, then slug match
    const exact = files.find(f => f.replace('.md', '') === title);
    if (exact) return exact;
    return files.find(f => slugify(f.replace('.md', '')) === slug);
  };

  // Recursive function to place files
  const processPage = async (title: string, currentPath: string) => {
    const slug = slugify(title);
    const sourceFile = findSource(title);
    if (!sourceFile) {
        console.warn(`Warning: Source file not found for "${title}"`);
        return;
    }

    const sourcePath = path.join(WIKI_FILES_DIR, sourceFile);
    const hasChildren = tree.has(title);

    if (hasChildren) {
      const dirPath = path.join(currentPath, slug);
      await fs.ensureDir(dirPath);
      
      // Category index
      await fs.copy(sourcePath, path.join(dirPath, 'index.md'));
      
      // _category_.json
      await fs.writeJson(path.join(dirPath, '_category_.json'), {
        label: title,
        link: { type: 'doc', id: path.join(path.relative(DOCS_DIR, dirPath), 'index') }
      }, { spaces: 2 });

      // Process children
      for (const child of tree.get(title)!) {
        await processPage(child, dirPath);
      }
    } else {
      await fs.copy(sourcePath, path.join(currentPath, `${slug}.md`));
    }
  };

  // Process root pages (no parent)
  const rootPages = pages.filter(p => !p.parent);
  for (const p of rootPages) {
    await processPage(p.title, DOCS_DIR);
  }

  console.log('Wiki sync complete!');
}

sync().catch(console.error);
