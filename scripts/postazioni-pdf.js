// Both manual export and Drive use these exact PDF bytes. No remote renderer.
let postazioniPdfCache=null;
async function buildPostazioniPdf(){
  const start=document.getElementById('rangeStart').value,end=document.getElementById('rangeEnd').value;
  if(!start||!end||end<start)throw new Error('Scegli un intervallo Dal–Al valido prima di creare il PDF.');
  const source=document.getElementById('rooms').cloneNode(true);
  if(!source.children.length)throw new Error('Nessuna stanza da stampare.');
  // Reuse the existing print stylesheet, including future changes to the cards.
  const css=document.querySelector('style').textContent.replace('@media print{','@media all{');
  const period='Periodo visualizzato: '+displayDate(start)+' – '+displayDate(end);
  const cacheKey=JSON.stringify([source.innerHTML,css,period]);
  if(postazioniPdfCache?.key===cacheKey)return postazioniPdfCache.value;
  if(!window.html2canvas||!window.jspdf)throw new Error('Generazione PDF non disponibile. Ricarica la pagina e riprova.');
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  frame.style.cssText='position:fixed;left:-20000px;top:0;width:1123px;height:794px;border:0;pointer-events:none';
  document.body.appendChild(frame);
  try{
    const doc=frame.contentDocument;
    doc.open();doc.write('<!doctype html><html lang="it"><head><meta charset="utf-8"><style>'+css+'\n.pdfSheet{width:277mm;background:white} .pdfSheet #rooms>.room{break-after:auto}</style></head><body></body></html>');doc.close();
    const sheet=doc.createElement('article');sheet.className='pdfSheet';doc.body.appendChild(sheet);
    const pdf=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    pdf.setProperties({title:'Spazi BIO - Postazioni',subject:period,creator:'Spazi BIO@DEI'});
    await doc.fonts.ready;
    const rooms=[...source.children];
    for(let i=0;i<rooms.length;i++){
      sheet.replaceChildren();
      if(i===0){
        const heading=doc.importNode(document.getElementById('printTitle'),true);
        heading.querySelector('#printPeriod').textContent=period;sheet.appendChild(heading);
      }
      const host=doc.createElement('div');host.id='rooms';host.appendChild(doc.importNode(rooms[i],true));sheet.appendChild(host);
      const canvas=await html2canvas(sheet,{scale:2,backgroundColor:'#ffffff',logging:false,windowWidth:1123,windowHeight:794});
      const width=Math.min(277,190*canvas.width/canvas.height),height=width*canvas.height/canvas.width;
      if(i)pdf.addPage('a4','landscape');
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',10,10,width,height,undefined,'FAST');
      canvas.width=canvas.height=0;
    }
    const bytes=pdf.output('arraybuffer');
    if(bytes.byteLength>12*1024*1024)throw new Error('PDF troppo grande. Seleziona meno stanze e riprova.');
    const blob=new Blob([bytes],{type:'application/pdf'});
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Lettura PDF non riuscita.'));reader.readAsDataURL(blob)});
    const value={blob,base64};
    postazioniPdfCache={key:cacheKey,value};return value;
  }finally{frame.remove()}
}

async function openPostazioniPdf(){
  // Open synchronously so Safari on iPhone treats this as a user gesture.
  const preview=window.open('about:blank','_blank');
  if(preview){preview.opener=null;preview.document.title='Preparazione PDF';preview.document.body.textContent='Preparazione PDF…';}
  const button=document.getElementById('printPostazioni');button.disabled=true;
  try{
    const result=await buildPostazioniPdf(),url=URL.createObjectURL(result.blob);
    if(preview)preview.location.replace(url);
    else{const link=document.createElement('a');link.href=url;link.download='Spazi BIO - Postazioni.pdf';link.click();}
    setTimeout(()=>URL.revokeObjectURL(url),300000);
  }catch(error){if(preview)preview.close();alert(error.message||'Creazione PDF non riuscita.');}
  finally{button.disabled=false}
}
