# Wiki Docusaurus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a Docusaurus v3 project, configure Mermaid, and implement a synchronization script that transforms a flat wiki directory and a hierarchical JSON into a nested, clickable Docusaurus structure.

**Architecture:** 
- **Initialization**: Standard Docusaurus v3 scaffold with TypeScript.
- **Configuration**: Mermaid theme integration and GitHub Pages metadata.
- **Sync Script**: A Node.js utility (`scripts/sync-wiki.ts`) that reads `wiki.json`, builds a tree, and copies Markdown files into a nested `docs/` structure using `index.md` and `_category.json` for clickable folders.

**Tech Stack:** Docusaurus v3, TypeScript, Node.js, Mermaid.

---

### Task 1: Initialize Docusaurus Project

**Files:**
- Create: `package.json`, `docusaurus.config.ts`, `sidebars.ts` (via scaffold)
- Modify: `docusaurus.config.ts`

- [ ] **Step 1: Clear existing root markdown files (to avoid conflicts with scaffold)**
Run: `rm *.md`
Expected: Root markdown files are removed.

- [ ] **Step 2: Initialize Docusaurus scaffold**
Run: `npx create-docusaurus@latest . classic --typescript --git-strategy=none` (Answer 'yes' to existing directory)
Expected: Docusaurus files created in current directory.

- [ ] **Step 3: Install Mermaid theme**
Run: `npm install @docusaurus/theme-mermaid`
Expected: Dependency added to `package.json`.

- [ ] **Step 4: Configure docusaurus.config.ts for Mermaid and GitHub Pages**
```typescript
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Wiki',
  tagline: 'Nested Wiki Documentation',
  favicon: 'img/favicon.ico',
  url: 'https://wiki-zh.github.io',
  baseUrl: '/',
  organizationName: 'wiki-zh',
  projectName: 'wiki-zh.github.io',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  trailingSlash: false,
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs from root
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Wiki',
      items: [],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Wiki.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

- [ ] **Step 5: Commit initialization**
Run: `git add . && git commit -m "chore: initialize docusaurus with mermaid"`

---

### Task 2: Implement Wiki Sync Script

**Files:**
- Create: `scripts/sync-wiki.ts`
- Modify: `package.json`

- [ ] **Step 1: Add sync script to package.json**
Add: `"sync": "ts-node scripts/sync-wiki.ts"` to `scripts`.

- [ ] **Step 2: Create sync script**
```typescript
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
    return files.find(f => slugify(f.replace('.md', '')) === slug);
  };

  // Recursive function to place files
  const processPage = async (title: string, currentPath: string) => {
    const slug = slugify(title);
    const sourceFile = findSource(title);
    if (!sourceFile) return;

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
```

- [ ] **Step 3: Install script dependencies**
Run: `npm install fs-extra ts-node @types/fs-extra @types/node`
Expected: Dependencies installed.

- [ ] **Step 4: Run sync and verify**
Run: `npm run sync`
Expected: `docs/` folder contains nested hierarchy with `index.md` and `_category_.json`.

- [ ] **Step 5: Commit sync script**
Run: `git add . && git commit -m "feat: add wiki sync script"`

---

### Task 3: Final Verification

- [ ] **Step 1: Start Docusaurus development server**
Run: `npm start`
Expected: Browser opens at `localhost:3000` showing the nested wiki.

- [ ] **Step 2: Verify Clickable Categories**
Action: Click a category folder in the left sidebar.
Expected: It opens the corresponding `index.md` content.

- [ ] **Step 3: Verify Mermaid**
Action: Navigate to a page with a Mermaid block.
Expected: Diagram is rendered correctly.

- [ ] **Step 4: Verify Right Sidebar (TOC)**
Expected: Right sidebar shows headings from the current document.
