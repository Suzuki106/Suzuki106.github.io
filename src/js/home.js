import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const container = document.getElementById('post-list');
const pager = document.getElementById('pager');
const params = new URLSearchParams(location.search);
const postSlug = params.get('p');
const page = parseInt(params.get('page')) || 1;
const PER_PAGE = 8;

if (postSlug) { renderPost(postSlug); } else { renderHome(page); }

async function renderHome(pageNum) {
  const res = await fetch('/manifest.json');
  const posts = await res.json();
  const totalPages = Math.ceil(posts.length / PER_PAGE) || 1;
  const slice = posts.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);

  let html = '';
  for (const p of slice) {
    html += `<div class="post-card">
      <div class="date">${p.date}</div>
      <h2><a href="/?p=${p.slug}">${p.title}</a></h2>
      <div class="excerpt">${p.excerpt}</div>
    </div>`;
  }
  container.innerHTML = html || '<div class="empty">暂无文章</div>';

  if (totalPages > 1) {
    let ph = '';
    for (let i = 1; i <= totalPages; i++) {
      ph += i === pageNum
        ? `<span class="page-btn active">${i}</span>`
        : `<a class="page-btn" href="/?page=${i}">${i}</a>`;
    }
    pager.innerHTML = ph;
  } else { pager.innerHTML = ''; }
}

async function renderPost(slug) {
  const res = await fetch(`/posts/${slug}.md`);
  if (!res.ok) { container.innerHTML = '<div class="empty">文章未找到</div>'; pager.innerHTML = ''; return; }
  const raw = await res.text();
  const { meta, body } = parseFrontmatter(raw);

  // protect math from marked
  const mathBlocks = [];
  let processed = body
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => `\x00M${mathBlocks.push({d:1,m:m.trim()})-1}\x00`)
    .replace(/\$([^\$\n]+?)\$/g, (_, m) => `\x00M${mathBlocks.push({d:0,m:m.trim()})-1}\x00`);

  let html = marked.parse(processed);
  html = html.replace(/\x00M(\d+)\x00/g, (_, i) => {
    const b = mathBlocks[i];
    try { return katex.renderToString(b.m, { displayMode: !!b.d, throwOnError: false }); }
    catch { return b.d ? `$$${b.m}$$` : `$${b.m}$`; }
  });

  document.title = `${meta.title || slug} — Suzuki106`;
  container.innerHTML = `<a class="back-link" href="/">← 返回</a>
    <h1 style="font-size:2rem;margin-bottom:0.3rem">${meta.title || slug}</h1>
    <div class="meta">${meta.date || ''}</div>
    <article>${html}</article>`;
  container.className = 'container post-view';
  pager.innerHTML = '';
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) meta[line.slice(0,idx).trim()] = line.slice(idx+1).trim();
  }
  return { meta, body: text.slice(match[0].length) };
}
