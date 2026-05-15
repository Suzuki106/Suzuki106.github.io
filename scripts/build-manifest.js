import { readdirSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const contentDir = join(root, 'content');
const publicDir = join(root, 'public');
const postsDir = join(publicDir, 'posts');

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: text.slice(match[0].length) };
}

const posts = [];
if (existsSync(contentDir)) {
  for (const file of readdirSync(contentDir)) {
    if (!file.endsWith('.md')) continue;
    const fp = join(contentDir, file);
    const raw = readFileSync(fp, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, '');
    const m = statSync(fp).mtime;
    const fb = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`;
    posts.push({
      slug,
      title: meta.title || slug,
      date: meta.date || fb,
      excerpt: body.replace(/[#*`\[\]()!>-]/g, '').trim().slice(0, 200),
    });
  }
}
posts.sort((a, b) => b.date.localeCompare(a.date));

if (!existsSync(publicDir)) mkdirSync(publicDir);
if (!existsSync(postsDir)) mkdirSync(postsDir, { recursive: true });

writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify(posts, null, 2));
console.log(`Manifest: ${posts.length} posts`);

for (const file of readdirSync(contentDir)) {
  if (!file.endsWith('.md')) continue;
  copyFileSync(join(contentDir, file), join(postsDir, file));
  console.log(`  copied: ${file}`);
}
