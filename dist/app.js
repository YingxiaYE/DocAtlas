(() => {
  'use strict';
  const key = 'docatlas-shortlist-en-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch { saved = []; }
  const selected = new Set(Array.isArray(saved) ? saved.filter(x => typeof x === 'string').slice(0,4) : []);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  let timer;
  function announce(text) { const s = $('#status'); if (!s) return; s.textContent = text; clearTimeout(timer); timer = setTimeout(() => s.textContent = '', 4200); }
  function sync() {
    document.querySelectorAll('[data-compare-count]').forEach(e => e.textContent = selected.size);
    document.querySelectorAll('.compare-add').forEach(b => {
      const has = selected.has(b.dataset.slug);
      b.textContent = has ? '✓ Shortlisted' : '+ Compare';
      b.setAttribute('aria-pressed', String(has));
    });
  }
  function persist() { try { localStorage.setItem(key, JSON.stringify([...selected])); } catch { announce('Your browser could not save the shortlist.'); } sync(); }
  let dataPromise;
  const tools = () => dataPromise ||= fetch('/tools.json').then(r => { if (!r.ok) throw new Error('Tools unavailable'); return r.json(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('.compare-add');
    if (!b) return;
    const slug = b.dataset.slug;
    if (selected.has(slug)) selected.delete(slug);
    else {
      if (selected.size >= 4) { announce('Compare up to four tools. Remove one from your shortlist first.'); return; }
      selected.add(slug);
    }
    persist();
    announce(selected.has(slug) ? 'Added to your shortlist. Open Compare to see the trade-offs.' : 'Removed from your shortlist.');
  });
  sync();
  const input = $('#search');
  if (input) {
    const cards = [...document.querySelectorAll('#tool-grid .card')];
    const controls = [...document.querySelectorAll('[data-filter]')];
    async function filter() {
      let data;
      try { data = await tools(); } catch { announce('Filtering is unavailable. You can still browse task pages and tool profiles.'); return; }
      const bySlug = Object.fromEntries(data.map(t => [t.slug,t]));
      const query = input.value.toLowerCase().trim();
      let visible = 0;
      cards.forEach(card => {
        const slug = card.querySelector('.compare-add').dataset.slug, t = bySlug[slug];
        const text = card.textContent.toLowerCase() + ' ' + JSON.stringify(t).toLowerCase();
        let match = text.includes(query);
        controls.forEach(c => {
          if (!c.value) return;
          if(c.dataset.filter === 'deployment') match &&= c.value === 'cloud' ? t.deployment.toLowerCase().includes('cloud api') : /self-hosted|local|server deployment/.test(t.deployment.toLowerCase());
          if(c.dataset.filter === 'license') match &&= t.license === c.value;
          if(c.dataset.filter === 'output') match &&= t.output.toLowerCase().includes(c.value.toLowerCase());
          if(c.dataset.filter === 'scans') match &&= /^(supported|page images|image-based)/i.test(t.scans);
          if(c.dataset.filter === 'provenance') match &&= c.value === 'semantic' ? t.cats.includes(6) : !t.cats.includes(6) && /coordinate|bounding-box|region (information|provenance|citations)/i.test(t.provenance) && !/no default/i.test(t.provenance);
          if(c.dataset.filter === 'pricing') {
            const pricing=t.pricing.toLowerCase();
            match &&= c.value === 'usage' ? pricing.includes('usage-based') : c.value === 'quote' ? pricing.includes('quote') : c.value === 'free' ? pricing.includes('free software') : /compute|model/.test(pricing);
          }
          if(c.dataset.filter === 'semantic') match &&= t.tags.includes(c.value);
        });
        card.hidden = !match;
        if(match) visible++;
      });
      $('#result-count').textContent = visible;
      $('#empty').hidden = visible !== 0;
    }
    input.addEventListener('input', filter);
    controls.forEach(c => c.addEventListener('change', filter));
    const reset = () => { input.value=''; controls.forEach(c=>c.value=''); filter(); };
    $('#reset').addEventListener('click', reset);
    $('#empty-reset').addEventListener('click', reset);
    $('#toggle-filters').addEventListener('click', () => {
      const area = $('#filters'); area.hidden = !area.hidden;
      $('#toggle-filters').setAttribute('aria-expanded', String(!area.hidden));
    });
    document.addEventListener('keydown', e => {
      if(e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }
  const comparison = $('#comparison');
  if(comparison) {
    async function renderComparison() {
      try {
        const all = await tools(), valid = new Set(all.map(t=>t.slug));
        [...selected].forEach(s=>{if(!valid.has(s)) selected.delete(s)});
        persist();
        const list = [...selected].map(s=>all.find(t=>t.slug===s));
        if(!list.length) { comparison.innerHTML='<div class="emptybox"><h2>Your shortlist starts here.</h2><p>Choose two to four tools to compare inputs, outputs, provenance, and limits.</p><a class="button" href="/#directory">Browse the directory →</a></div>';return; }
        const fields = [['Input','input'],['Output','output'],['Provenance','provenance'],['Scanned pages','scans'],['Deployment','deployment'],['Availability','license'],['Costs to plan for','pricing'],['Semantic capabilities','tags'],['Limitations to check','limits']];
        comparison.innerHTML=(list.length<2?'<p class="comparehint">Add one more tool for a side-by-side comparison. <a href="/#directory">Browse tools →</a></p>':'')+'<div class="comparewrap"><table><thead><tr><th scope="col">Compare by</th>'+list.map(t=>'<th scope="col"><h2><a href="/tools/'+esc(t.slug)+'/">'+esc(t.name)+'</a></h2><button data-remove="'+esc(t.slug)+'" aria-label="Remove '+esc(t.name)+'">Remove</button></th>').join('')+'</tr></thead><tbody>'+fields.map(([label,k])=>'<tr><th scope="row">'+label+'</th>'+list.map(t=>'<td>'+esc(Array.isArray(t[k])?(t[k].join(', ')||'Not applicable'):t[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
      } catch { comparison.textContent='The comparison data could not be loaded. Please reload or browse the individual tool profiles.'; }
    }
    comparison.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){selected.delete(b.dataset.remove);persist();renderComparison()}});
    renderComparison();
  }
  const themeButton = $('#theme-toggle');
  const themeQuery = matchMedia('(prefers-color-scheme: dark)');
  function renderTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    if(themeButton) {
      themeButton.setAttribute('aria-label',label);
      themeButton.title=label;
      themeButton.setAttribute('aria-pressed',String(dark));
      themeButton.innerHTML='<span aria-hidden="true">'+(dark?'☼':'☾')+'</span>';
    }
    const color=document.querySelector('meta[name="theme-color"]');
    if(color) color.content=dark?'#101b16':'#183c2e';
  }
  if(themeButton) themeButton.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try { localStorage.setItem('docatlas-theme',next); } catch {}
    renderTheme();
  });
  themeQuery.addEventListener('change',e=>{
    let manual=false;
    try { manual=['light','dark'].includes(localStorage.getItem('docatlas-theme')); } catch {}
    if(!manual) { document.documentElement.dataset.theme=e.matches?'dark':'light';renderTheme(); }
  });
  renderTheme();
})();

// Collect aggregate page views on DocAtlas production domains.
(() => {
  const hosts = ['www.documentai.directory', 'documentai.directory', 'docatlas-document-ai.vercel.app', 'docatlas-tools.vercel.app'];
  if (!hosts.includes(location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
