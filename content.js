/* Public, read-only portfolio renderer. Unconfigured/unavailable Supabase leaves the original static site visible. */
(async () => {
  const config = window.PORTFOLIO_SUPABASE;
  if (!config?.url || !config?.publishableKey || config.url.includes('YOUR_PROJECT_REF')) return;
  const api = window.supabase;
  if (!api?.createClient) return;
  const client = api.createClient(config.url, config.publishableKey);
  const { data, error } = await client.from('portfolio_content').select('content').eq('id', 1).single();
  if (error || !data?.content) { console.warn('Using static portfolio fallback. Supabase response:', error?.message); return; }
  // Resume stays on the bundled, reference-free PDF until an admin publishes a revision.
  try {
    const {data: resumeRow, error: resumeError} = await client.from('portfolio_resume').select('active_path').eq('id',1).maybeSingle();
    const path = resumeRow?.active_path;
    if (!resumeError && typeof path === 'string' && /^generated\/[a-zA-Z0-9._-]+\.pdf$/.test(path)) {
      const {data: resumePublic} = client.storage.from('portfolio-resumes').getPublicUrl(path);
      if (resumePublic?.publicUrl) document.querySelectorAll('a.resume-link').forEach(a=>a.href=resumePublic.publicUrl);
    }
  } catch(err) { console.warn('Keeping baseline resume:',err); }
  const c = data.content;
  const $ = (s) => document.querySelector(s);
  const set = (s, val) => { const el = $(s); if (el && typeof val === 'string') el.textContent = val; };
  const el = (name, cls, text) => { const node=document.createElement(name); if(cls)node.className=cls; if(text!==undefined) node.textContent=String(text); return node; };
  const safeUrl = (value) => { try {const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;} };
  const hero=c.hero||{}; const about=c.about||{}; const contact=c.contact||{};
  // Accept only portraits hosted in this project's dedicated public Supabase bucket.
  const portrait=document.getElementById('portrait-photo');
  if(portrait&&typeof hero.photoUrl==='string'&&config.url){
    try {
      const project=new URL(config.url);
      const url=new URL(hero.photoUrl);
      const prefix='/storage/v1/object/public/portfolio-media/portraits/';
      if(url.origin===project.origin&&url.pathname.startsWith(prefix)&&/\.(jpe?g|png|webp)$/i.test(url.pathname)){
        portrait.addEventListener('error',()=>{portrait.hidden=true;},{once:true});
        portrait.src=url.href;portrait.hidden=false;
      }
    } catch(_e) {/* Preserve the illustration on invalid URL. */}
  }
  if (hero.availability) { const a=$('.availability'); if(a) { a.replaceChildren(el('span','pulse'),document.createTextNode(' '+hero.availability)); } }
  set('.hero-desc', hero.description);
  if (hero.location) { const foot=$('.hero-foot span:first-child'); if(foot) foot.replaceChildren(el('i'),document.createTextNode(' '+hero.location)); }
  set('.hero-foot span:nth-child(2)',hero.university);
  set('.about-text > p:first-child',about.paragraph1);
  set('.about-text > p:nth-child(2)',about.paragraph2);
  set('.contact-inner > p:not(.eyebrow)',contact.message);
  if (contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {a.href=`mailto:${contact.email}`;if(a.classList.contains('contact-link'))a.replaceChildren(document.createTextNode(contact.email+' '),el('span','', '↗'));});
  }
  if (safeUrl(contact.linkedin)) document.querySelectorAll('a[href*="linkedin.com/"]').forEach(a=>{ a.href=safeUrl(contact.linkedin); });
  if (Array.isArray(c.experience)) {
    const box=$('.timeline'); if(box){box.replaceChildren(); c.experience.forEach(item=>{
      const article=el('article','timeline-item');article.append(el('div','timeline-date',item.period));
      const body=el('div','timeline-content');body.append(el('div','tag',item.category),el('h3','',item.title),el('p','org',item.organization),el('p','',item.description));
      if(item.note)body.append(el('span','small-note',item.note));article.append(body);box.append(article);
    });}
  }
  if (Array.isArray(c.focus)) {
    const box=$('.project-grid');if(box){ const decorative=[...box.querySelectorAll('.project-visual')].map(node=>node.cloneNode(true));box.replaceChildren();c.focus.forEach((item,i)=>{
      const article=el('article',i===0?'project-card featured':'project-card');
      const top=el('div','project-top');top.append(el('span','project-num',`${String(i+1).padStart(2,'0')} / ${item.category||'FOCUS'}`),el('span','project-symbol',i?'⌁':'↗'));
      article.append(top);
      if(decorative[i])article.append(decorative[i].cloneNode(true));else article.append(el('div','project-visual grc-visual','SECURITY · LEARNING · DEVELOPMENT'));
      const body=el('div','project-body');body.append(el('h3','',item.title),el('p','',item.description));const tags=el('div','chips');String(item.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>tags.append(el('span','',s)));body.append(tags,el('div','project-status','↗ '+(item.status||'Career interest')));article.append(body);box.append(article);
    });}
  }
  if(Array.isArray(c.skills)){
    const box=$('.skills-grid');if(box){box.replaceChildren();c.skills.forEach(item=>{const art=el('article','skill-box');art.append(el('div','skill-icon',item.icon),el('h3','',item.title),el('p','',item.description));box.append(art);});}
  }
  const populate=(selector,items)=>{ const box=$(selector);if(!box||!Array.isArray(items))return;box.replaceChildren();items.forEach(item=>{const line=el('div','');line.append(el('span','',item.name),el('small','',item.year));box.append(line);}); };
  populate('.credentials:not(.honors) .credential-list',c.certifications);
  populate('.credentials.honors .credential-list',c.awards);
})();
