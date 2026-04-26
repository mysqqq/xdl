const ALLDL = (u) => `https://api-library-kohi.onrender.com/api/alldl?url=${encodeURIComponent(u)}`;
const SMFAHIM = (u) => `https://www.smfahim.xyz/download/twitter/v1?url=${encodeURIComponent(u)}`;

const urlInput = document.getElementById('urlInput');
const btn = document.getElementById('downloadBtn');
const status = document.getElementById('status');
const resultBox = document.getElementById('result');

function setStatus(m, t) { status.className = 'status' + (t ? ' ' + t : ''); status.textContent = m || ''; }
function setLoading(on) { btn.disabled = on; btn.innerHTML = on ? '<span class="spinner"></span>Processing…' : 'Download'; }
function clear() { resultBox.innerHTML = ''; setStatus(''); }
function escape(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

function pick(data) {
  const d = data?.data || data;
  const variants = [];
  const seen = new Set();
  const add = (url, label) => { if (!url || seen.has(url)) return; seen.add(url); variants.push({ url, label: label || 'Download' }); };

  const arrCandidates = [d?.media, d?.medias, d?.variants, d?.video, d?.videos, d?.urls, d?.results, Array.isArray(d) ? d : null].filter(Boolean);
  arrCandidates.forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(v => {
      if (typeof v === 'string') add(v);
      else if (v && typeof v === 'object') {
        const u = v.url || v.download_url || v.downloadUrl || v.video || v.videoUrl;
        const q = v.quality || v.label || v.bitrate || v.resolution || '';
        add(u, q ? String(q).toUpperCase() : '');
      }
    });
  });
  add(d?.videoUrl); add(d?.url); add(d?.download_url); add(d?.downloadUrl);

  const thumb = d?.thumbnail || d?.cover || d?.image;
  const title = d?.title || d?.description || d?.text || '';
  return { variants, thumb, title };
}

async function fetchVideo(url) {
  const [a, s] = await Promise.allSettled([
    fetch(ALLDL(url)).then(r => r.json()).catch(() => null),
    fetch(SMFAHIM(url)).then(r => r.json()).catch(() => null),
  ]);
  const all = a.value;
  const sm = s.value ? pick(s.value) : { variants: [] };
  const variants = [...sm.variants];
  if (all?.status && all?.data?.videoUrl) {
    const exists = variants.find(v => v.url === all.data.videoUrl);
    if (!exists) variants.unshift({ url: all.data.videoUrl, label: 'HD' });
  }
  if (!variants.length) throw new Error('No video found');
  return { variants, thumb: sm.thumb, title: sm.title, platform: all?.data?.platform || 'X' };
}

async function run() {
  const url = urlInput.value.trim();
  clear();
  if (!url) return setStatus('⚠️ Please enter an X (Twitter) URL.', 'error');
  if (!/twitter\.com|x\.com/i.test(url)) return setStatus('⚠️ Invalid X (Twitter) URL.', 'error');

  setLoading(true); setStatus('⏳ Fetching content…');
  try {
    const m = await fetchVideo(url);
    console.log('X result', m);

    let html = `<div class="result">`;
    if (m.platform) html += `<span class="platform-badge">𝕏 ${escape(m.platform)}</span>`;
    html += `<video class="preview" src="${m.variants[0].url}" ${m.thumb ? `poster="${m.thumb}"` : ''} controls preload="metadata" playsinline></video>`;
    if (m.title) html += `<div class="meta">${escape(m.title)}</div>`;
    html += `<div class="qrow">`;
    m.variants.forEach((v, i) => {
      html += `<a class="dl" href="${v.url}" download="x-video.mp4" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        Download${m.variants.length > 1 ? ` Option ${i + 1}` : ''}
        ${v.label ? `<span class="qbadge">${escape(v.label)}</span>` : ''}
      </a>`;
    });
    html += `</div></div>`;

    resultBox.innerHTML = html;
    setStatus('');
  } catch (e) {
    console.error(e);
    setStatus('❌ Failed to fetch content. The post may be private or the link is invalid.', 'error');
  } finally { setLoading(false); }
}

btn.addEventListener('click', run);
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') run(); });
