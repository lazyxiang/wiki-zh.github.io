# Wiki Design: Docusaurus with Nested Hierarchy

This document outlines the design for initializing and configuring a Docusaurus-based wiki to display a nested hierarchy of Markdown and Mermaid documents.

## 1. System Architecture

- **Platform**: Docusaurus v3 (Latest)
- **Language**: TypeScript
- **Rendering**: 
  - Markdown: Docusaurus (MDX)
  - Diagrams: `@docusaurus/theme-mermaid`
- **Navigation**:
  - Left Sidebar: Auto-generated from `docs/` folder structure, matching `wiki.json`.
  - Right Sidebar: Docusaurus Table of Contents (TOC).

## 2. Directory Structure

The project will be initialized in `/Users/lazyxiang/code/wiki-zh.github.io/`.

```text
/Users/lazyxiang/code/wiki-zh.github.io/
├── docs/                 # Wiki content (generated from sync script)
│   ├── category-1/
│   │   ├── index.md      # Clickable category content
│   │   ├── _category.json # Sidebar configuration
│   │   └── sub-doc.md    # Leaf document
│   └── doc.md            # Top-level document
├── scripts/
│   └── sync-wiki.ts      # Script to transform wiki.json to docs/
├── docusaurus.config.ts  # Main configuration
└── package.json          # Dependencies (including Mermaid)
```

## 3. Data Transformation Logic

A synchronization script (`scripts/sync-wiki.ts`) will perform the following:

1.  **Parse `wiki.json`**: Read the `pages` array to build a tree structure.
2.  **File Mapping**: Match `title` in JSON to kebab-case filenames in `~/Downloads/wiki/`.
3.  **Hierarchy Generation**:
    - If a page has children:
      - Create a directory `docs/<path>/<category-name>/`.
      - Move the source `.md` to `docs/<path>/<category-name>/index.md`.
      - Create `_category.json` with `link: { type: 'doc', id: '<path>/<category-name>/index' }`.
    - If a page is a leaf:
      - Copy the source `.md` to `docs/<path>/<page-name>.md`.
4.  **Metadata Preservation**: Keep frontmatter if present, otherwise generate basic `title` frontmatter.

## 4. Mermaid Configuration

In `docusaurus.config.ts`:
- Enable `markdown: { mermaid: true }`.
- Add `@docusaurus/theme-mermaid` to `themes`.

## 5. Deployment Strategy

- **Target**: GitHub Pages (`https://wiki-zh.github.io/`).
- **Configuration**:
  - `url`: `https://wiki-zh.github.io`
  - `baseUrl`: `/`
  - `organizationName`: `wiki-zh`
  - `projectName`: `wiki-zh.github.io`
  - `trailingSlash`: false
