/* The database's RLS decides who may edit or publish, not the visibility of /admin/. */
const cfg=window.PORTFOLIO_SUPABASE;
const notice=document.getElementById('notice');
const state=document.getElementById('state');
const login=document.getElementById('login');
const dashboard=document.getElementById('dashboard');
const form=document.getElementById('editor-form');
const fields=document.getElementById('fields');
const tabs=document.getElementById('tabs');
let db=null, content=null, section='hero', currentUser=null, resumeRecord=null, lastSavedJson='';
const BASELINE_RESUME='../assets/resume.pdf';
const BUCKET='portfolio-resumes';
const specs={
  hero:{title:'Homepage & Portrait',help:'Edit your introduction, availability, and optionally upload your own portrait.', fields:{availability:'Availability banner',description:'Professional introduction',location:'Location',university:'University / current status'}},
  about:{title:'About',help:'Tell employers about your professional background and direction.',fields:{paragraph1:'About paragraph 1',paragraph2:'About paragraph 2'}},
  contact:{title:'Contact & Links',help:'Keep your public email and LinkedIn URL accurate.',fields:{email:'Public email',linkedin:'LinkedIn HTTPS URL',message:'Contact section message'}},
  experience:{title:'Experience & Education',help:'Add, update, or remove timeline entries. These also feed your resume.',list:{period:'Date / period',category:'Category',title:'Role or degree',organization:'Organization',description:'Description',note:'Optional note'}},
  focus:{title:'Security Focus',help:'Career interests and current learning, not falsely labeled completed projects.',list:{category:'Type',title:'Area',description:'Description',tags:'Tags (comma separated)',status:'Status'}},
  skills:{title:'Skills',help:'Accurate technical skills and learning interests. Also feeds the resume.',list:{icon:'Symbol',title:'Skill area',description:'Tools, skills, or learning interests'}},
  certifications:{title:'Certifications',help:'Publish only qualifications you really hold. Also feeds the resume.',list:{name:'Credential name',year:'Year'}},
  awards:{title:'Awards',help:'Add documented recognitions and achievements. Also feeds the resume.',list:{name:'Award / recognition',year:'Year'}},
  resume:{title:'Resume PDF',help:'Review resume settings, detect relevant changes, preview a new PDF, and publish only when ready.',fields:{name:'Your name',phone:'Phone number for resume',summary:'Resume professional summary',languages:'Languages (separated by semicolons)'}}
};
const make=(name,cls,text)=>{const e=document.createElement(name);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const canonical=obj=>JSON.stringify(obj,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
function resumeSource(c){
  return {
    contact:{email:c.contact?.email||'',linkedin:c.contact?.linkedin||''},
    location:c.hero?.location||'',
    resume:c.resume||{},
    experience:c.experience||[],
    skills:c.skills||[],
    certifications:c.certifications||[],
    awards:c.awards||[]
  };
}
function changedForResume(){return Boolean(content&&resumeRecord)&&canonical(resumeSource(content))!==canonical(resumeRecord.source_snapshot);}
function unsaved(){return content&&JSON.stringify(content)!==lastSavedJson;}
function showMessage(msg,bad=false){notice.textContent=msg;notice.style.color=bad?'#ffb5b5':'#a4f4ce';}
function fieldInput(label,value,callback,long=false){
  const wrap=make('label','field');wrap.append(make('span','',label));
  const input=make(long?'textarea':'input');input.value=String(value??'');
  input.addEventListener('input',()=>callback(input.value));wrap.append(input);return wrap;
}
function updateUnsaved(){state.textContent=unsaved()?'Unsaved changes':'All changes saved';if(section==='resume')refreshResumeStatus();}
function renderTabs(){tabs.replaceChildren();Object.entries(specs).forEach(([key,item])=>{
  const b=make('button',section===key?'active':'',item.title);b.type='button';
  b.addEventListener('click',()=>{section=key;renderTabs();renderSection();updateUnsaved();});tabs.append(b);
});}
function renderSection(){
  const spec=specs[section];document.getElementById('section-title').textContent=spec.title;
  document.getElementById('section-help').textContent=spec.help;fields.replaceChildren();
  if(spec.fields){
    if(!content[section])content[section]={};
    Object.entries(spec.fields).forEach(([key,label])=>{
      fields.append(fieldInput(label,content[section]?.[key],v=>{content[section][key]=v;updateUnsaved();},
        ['description','paragraph1','paragraph2','message','summary'].includes(key)));
    });
    if(section==='hero')renderPortraitPanel();
    if(section==='resume')renderResumePanel();
    return;
  }
  if(!Array.isArray(content[section]))content[section]=[];
  content[section].forEach((item,index)=>{
    const box=make('article','entry'),top=make('div','entry-top');top.append(make('span','',`Entry ${index+1}`));
    const remove=make('button','remove','Remove');remove.type='button';
    remove.addEventListener('click',()=>{content[section].splice(index,1);renderSection();updateUnsaved();});
    top.append(remove);box.append(top);
    const inner=make('div','grid-fields');Object.entries(spec.list).forEach(([key,label])=>{
      inner.append(fieldInput(label,item[key]||'',v=>{item[key]=v;updateUnsaved();},key==='description'));
    });box.append(inner);fields.append(box);
  });
  const add=make('button','add','+ Add another entry');add.type='button';
  add.addEventListener('click',()=>{const item={};Object.keys(spec.list).forEach(k=>item[k]='');content[section].push(item);renderSection();updateUnsaved();});fields.append(add);
}
function renderPortraitPanel(){
  const panel=make('section','portrait-panel');
  panel.append(make('h3','','Professional portrait (optional)'),
    make('p','','Upload a JPG, PNG or WebP up to 3 MB. Until you upload one, your existing illustrated portrait stays visible. The photo is public if you publish it.'));
  const current=make('p','portrait-current',content.hero.photoUrl?'Uploaded photo is selected. Save your changes to display it on the website.':'Using the original illustrated placeholder.');
  const input=make('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Upload professional portrait');
  const upload=make('button','','Upload photo');upload.type='button';
  upload.addEventListener('click',async()=>{
    if(!db||!currentUser){showMessage('Sign in before uploading.',true);return;}
    const file=input.files?.[0];
    if(!file){showMessage('Select a photo file first.',true);return;}
    const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!(file.type in allowed)||file.size>3*1024*1024){showMessage('Choose a JPG, PNG or WebP photo smaller than 3 MB.',true);return;}
    upload.disabled=true;showMessage('Uploading portrait...');
    try{
      const extension=allowed[file.type];
      const bytes=crypto.getRandomValues(new Uint8Array(10));
      const suffix=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
      const path=`portraits/photo-${Date.now()}-${suffix}.${extension}`;
      const {error}=await db.storage.from('portfolio-media').upload(path,file,{contentType:file.type,upsert:false});
      if(error)throw error;
      const {data}=db.storage.from('portfolio-media').getPublicUrl(path);
      content.hero.photoUrl=data.publicUrl;
      current.textContent='Photo uploaded. Click “Save changes” below to publish it on your homepage.';
      updateUnsaved();showMessage('Photo uploaded. Save your website changes to use it.');
    }catch(error){showMessage('Upload failed: '+error.message,true);}
    finally{upload.disabled=false;}
  });
  const clear=make('button','outline','Use illustration instead');clear.type='button';
  clear.addEventListener('click',()=>{content.hero.photoUrl='';input.value='';current.textContent='Illustrated placeholder selected. Save changes to publish this selection.';updateUnsaved();});
  const actions=make('div','resume-actions');actions.append(upload,clear);
  panel.append(current,input,actions);fields.append(panel);
}
function currentResumeHref(){
  const path=resumeRecord?.active_path;
  if(typeof path==='string'&&/^generated\/[A-Za-z0-9._-]+\.pdf$/.test(path)){
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  return BASELINE_RESUME;
}
function renderResumePanel(){
  const panel=make('section','resume-panel');panel.id='resume-panel';
  const heading=make('h3','','Published resume');
  const desc=make('p','','The current PDF stays live until you explicitly publish a replacement. Only resume-relevant changes trigger an update.');
  const status=make('p','resume-status');status.id='resume-status';
  const current=make('a','resume-download','View current published PDF ↗');current.id='resume-current';
  current.href=currentResumeHref();current.target='_blank';current.rel='noopener noreferrer';
  const actions=make('div','resume-actions');
  const preview=make('button','outline','Download draft PDF');preview.type='button';preview.id='resume-preview';
  preview.addEventListener('click',()=>{
    try{
      const blob=window.generatePortfolioResume(content);const link=document.createElement('a');const url=URL.createObjectURL(blob);
      link.href=url;link.download='Roshan_Basnet_resume_draft.pdf';document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      showMessage('Draft downloaded. Review its content and formatting before publishing.');
    }catch(err){showMessage('Could not generate draft: '+err.message,true);}
  });
  const publish=make('button','','Generate & publish updated resume ↗');publish.type='button';publish.id='resume-publish';
  publish.addEventListener('click',publishResume);
  actions.append(preview,publish);panel.append(heading,desc,status,current,actions,
    make('p','resume-caution','Use the draft to verify accuracy. This PDF is generated from your stored content, without AI or invented qualifications. Reference contact details are excluded.'));
  fields.append(panel);refreshResumeStatus();
}
function refreshResumeStatus(){
  const status=document.getElementById('resume-status'),publish=document.getElementById('resume-publish'),view=document.getElementById('resume-current');
  if(!status||!resumeRecord)return;
  const pending=changedForResume(),dirty=unsaved();
  const baseline=!resumeRecord.active_path;
  status.className='resume-status '+(pending?'pending':'ready');
  status.textContent=pending
    ? (dirty?'Resume-related changes detected. Save the website changes first, then publish a PDF.':'Resume-related changes saved. Your currently published PDF is unchanged until you publish.')
    : (`Up to date - ${baseline?'the original reference-free resume is still in use':`generated revision ${resumeRecord.revision} is published`}.`);
  if(publish){publish.disabled=!pending||dirty;publish.title=dirty?'Save changes first':pending?'Publish a new PDF':'No resume changes to publish';}
  if(view)view.href=currentResumeHref();
}
async function publishResume(){
  if(!db||!currentUser||!resumeRecord||!content)return;
  if(unsaved()){showMessage('Save your content changes before publishing your resume.',true);return;}
  if(!changedForResume()){showMessage('No resume-relevant changes detected. Your current PDF is unchanged.');return;}
  const button=document.getElementById('resume-publish');button.disabled=true;
  showMessage('Generating the PDF and uploading a new revision...');
  try{
    const source=resumeSource(content);
    const blob=window.generatePortfolioResume(content);
    const name=`resume-${Date.now()}-${Math.random().toString(36).slice(2,10)}.pdf`;
    const path=`generated/${name}`;
    const {error:uploadError}=await db.storage.from(BUCKET).upload(path,blob,{contentType:'application/pdf',cacheControl:'3600',upsert:false});
    if(uploadError)throw uploadError;
    const {data,error}=await db.from('portfolio_resume').update({
      active_path:path,source_snapshot:source,revision:resumeRecord.revision+1,generated_at:new Date().toISOString()
    }).eq('id',1).select('*').single();
    if(error)throw error;
    if(!data)throw new Error('Publication denied by database permissions.');
    resumeRecord=data;refreshResumeStatus();
    showMessage('Updated resume published successfully. The website now links to revision '+data.revision+'.');
  }catch(err){showMessage('Resume not published; the previous PDF remains active. '+err.message,true);}
  finally{refreshResumeStatus();}
}
async function refreshUser(){
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){currentUser=null;login.hidden=false;dashboard.hidden=true;return;}
  const check=await db.from('portfolio_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(check.error||!check.data){await db.auth.signOut();currentUser=null;login.hidden=false;dashboard.hidden=true;showMessage('Not an approved administrator. Add your Auth User UID to portfolio_admins.',true);return;}
  const results=await Promise.all([
    db.from('portfolio_content').select('content').eq('id',1).single(),
    db.from('portfolio_resume').select('*').eq('id',1).single()
  ]);
  if(results[0].error||!results[0].data?.content){showMessage('Could not load content. Run setup.sql.',true);return;}
  if(results[1].error||!results[1].data){showMessage('Resume extension not installed. Run supabase/upgrade_resume.sql.',true);return;}
  content=results[0].data.content;
  content.resume??={name:'Roshan Basnet',phone:'',summary:'',languages:''};
  lastSavedJson=JSON.stringify(content);
  resumeRecord=results[1].data;currentUser=user;login.hidden=true;dashboard.hidden=false;
  renderTabs();renderSection();updateUnsaved();showMessage('Signed in. Portfolio editing and resume publishing are protected by RLS.');
}
async function start(){
  if(!cfg?.url||!cfg?.publishableKey||cfg.url.includes('YOUR_PROJECT_REF')){showMessage('Edit supabase-config.js with your URL and publishable key.',true);return;}
  if(!window.supabase?.createClient){showMessage('Supabase JavaScript failed to load.',true);return;}
  db=window.supabase.createClient(cfg.url,cfg.publishableKey);await refreshUser();
}
document.getElementById('login-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!db){showMessage('Configure Supabase first.',true);return;}
  const button=e.target.querySelector('button');button.disabled=true;showMessage('Checking credentials...');
  try{const fd=new FormData(e.target);const {error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error)throw error;await refreshUser();}
  catch(err){showMessage('Sign-in failed: '+err.message,true);}finally{button.disabled=false;}
});
form.addEventListener('submit',async e=>{
  e.preventDefault();if(!db||!content||!currentUser)return;
  const btn=document.getElementById('save');btn.disabled=true;state.textContent='Saving...';
  try{
    const {data,error}=await db.from('portfolio_content').update({content,updated_at:new Date().toISOString()}).eq('id',1).select('id').single();
    if(error)throw error;if(!data)throw new Error('Update was not authorized.');
    lastSavedJson=JSON.stringify(content);updateUnsaved();showMessage('Website content saved. Resume status reflects changes separately.');
  }catch(err){state.textContent='Save failed';showMessage('Unable to save: '+err.message,true);}
  finally{btn.disabled=false;}
});
document.getElementById('logout').addEventListener('click',async()=>{
  if(db)await db.auth.signOut();content=null;resumeRecord=null;currentUser=null;dashboard.hidden=true;login.hidden=false;showMessage('Signed out.');
});
start();
