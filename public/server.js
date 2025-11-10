async function fetchJSON(url, opts){ const r = await fetch(url, opts); return r.json(); }

async function loadStats(){
  const data = await fetchJSON('/api/stats');
  const routes = data.routes || {};
  const stats = data.stats || {};
  const list = Object.keys(routes).length? Object.entries(routes).map(([a,u])=>`<li><b>/${a}</b> → <a href="/${a}" target="_blank">${u}</a></li>`).join('') : '<li>No links yet</li>';
  document.getElementById('linksList').innerHTML = `<ul>${list}</ul>`;
  document.getElementById('stats').textContent = JSON.stringify(stats, null, 2);
}

document.getElementById('addBtn').addEventListener('click', async ()=>{
  const alias = document.getElementById('alias').value.trim();
  const link = document.getElementById('link').value.trim();
  if(!alias || !link){ alert('alias and link required'); return; }
  const res = await fetch('/api/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ alias, link }) });
  const j = await res.json();
  if(j.ok) { document.getElementById('addResult').textContent = 'Added: /' + j.alias; loadStats(); }
  else document.getElementById('addResult').textContent = 'Error';
});

document.getElementById('shortenBtn').addEventListener('click', async ()=>{
  const url = document.getElementById('shortenUrl').value.trim();
  const alias = document.getElementById('shortenAlias').value.trim();
  if(!url){ alert('url required'); return; }
  const res = await fetch('/api/shorten', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url, alias }) });
  const j = await res.json();
  if(j.ok) document.getElementById('shortenResult').innerHTML = '<a href="'+j.short+'" target="_blank">'+j.short+'</a>';
  else document.getElementById('shortenResult').textContent = 'Error: ' + (j.error || 'failed');
  loadStats();
});

document.getElementById('themeToggle').addEventListener('click', ()=> document.body.classList.toggle('light'));
window.addEventListener('DOMContentLoaded', loadStats);
