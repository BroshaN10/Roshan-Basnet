/* Simple single-column, text-selectable ATS-oriented PDF resume. No client secrets or AI-generated claims. */
window.generatePortfolioResume = function generatePortfolioResume(content) {
  if (!window.jspdf?.jsPDF) throw new Error('PDF library failed to load. Check the network and try again.');
  const doc = new window.jspdf.jsPDF({unit:'pt',format:'letter',compress:true});
  const margin = 46, right = 566, maxW = right-margin, bottom = 742;
  let y=51;
  const clean = input => String(input??'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201c\u201d]/g,'"').replace(/[\u2022\u00b7]/g,'-').replace(/[^\x20-\x7E\n]/g,' ').replace(/\s+/g,' ').trim();
  const line = (text,size=9.3,bold=false,indent=0,lineHeight=12) => {
    const str=clean(text);if(!str)return;
    doc.setFont('helvetica',bold?'bold':'normal').setFontSize(size).setTextColor(24,34,42);
    const lines=doc.splitTextToSize(str,maxW-indent);
    if(y+lines.length*lineHeight>bottom){doc.addPage();y=margin;}
    lines.forEach(value=>{doc.text(value,margin+indent,y);y+=lineHeight;});
  };
  const section = title => {
    y+=9; if(y+31>bottom){doc.addPage();y=margin;}
    doc.setDrawColor(170,181,187).setLineWidth(.7).line(margin,y-5,right,y-5);
    line(title,9.6,true,0,16);
  };
  const items=arr=>Array.isArray(arr)?arr:[];
  const r=content.resume||{}, con=content.contact||{}, hero=content.hero||{};
  const name=clean(r.name)||'Roshan Basnet';
  doc.setFont('helvetica','bold').setFontSize(19).setTextColor(15,29,42);
  doc.text(name,margin,y);y+=22;
  const location=clean(hero.location).replace(/^based in\s+/i,'');
  const contact=[location,clean(r.phone),clean(con.email),clean(con.linkedin)].filter(Boolean).join(' | ');
  line(contact,8.4,false,0,12);
  const summary=clean(r.summary);
  if(summary){section('PROFESSIONAL SUMMARY');line(summary,9.4,false,0,13);}
  const experience=items(content.experience);
  const jobs=experience.filter(e=>!/(^|\W)EDUCATION(\W|$)/i.test(String(e.category||'')));
  const education=experience.filter(e=>/(^|\W)EDUCATION(\W|$)/i.test(String(e.category||'')));
  const entries=(arr)=>arr.forEach(entry=>{
    y+=3;line([entry.title,entry.period].filter(Boolean).join('  |  '),9.3,true,0,13);
    line(entry.organization,9,false,0,12);
    if(entry.description)line(entry.description,9,false,9,12);
    if(entry.note)line(entry.note,8.6,false,9,12);
    y+=2;
  });
  if(jobs.length){section('PROFESSIONAL EXPERIENCE');entries(jobs);}
  if(education.length){section('EDUCATION');entries(education);}
  const skills=items(content.skills);
  if(skills.length){section('TECHNICAL SKILLS & DEVELOPMENT');skills.forEach(s=>line([s.title,s.description].filter(Boolean).join(': '),9,false,0,13));}
  const certs=items(content.certifications);
  if(certs.length){section('CERTIFICATIONS');certs.forEach(v=>line([v.name,v.year].filter(Boolean).join(' | '),9,false,0,13));}
  const awards=items(content.awards);
  if(awards.length){section('AWARDS & HONORS');awards.forEach(v=>line([v.name,v.year].filter(Boolean).join(' | '),9,false,0,13));}
  if(r.languages){section('LANGUAGES');line(String(r.languages).replace(/;/g,' | '),9);}
  const count=doc.getNumberOfPages();
  for(let page=1;page<=count;page++){
    doc.setPage(page);doc.setTextColor(130,140,150).setFont('helvetica','normal').setFontSize(8);
    doc.text(`Page ${page} of ${count}`,right,765,{align:'right'});
  }
  return doc.output('blob');
};
