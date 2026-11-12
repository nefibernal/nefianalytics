(function(root){
  'use strict';
  function build(report){
    if(!['portrait','landscape'].includes(report.orientation))throw Error('Select Portrait or Landscape in setup.');
    const doc=new root.jspdf.jsPDF({orientation:report.orientation,format:'letter',unit:'pt',compress:true});
    doc.addFileToVFS('NefiReport.ttf',root.NefiReportFont);doc.addFont('NefiReport.ttf','Report','normal');doc.setFont('Report','normal');
    doc.setProperties({title:report.title,creator:'Nefi Print Report 1.0.2'});
    const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=32,usable=width-2*margin;
    doc.setFontSize(14);const title=doc.splitTextToSize(report.title,usable),top=margin+title.length*17+14;
    if(top>height/2)throw Error('The worksheet name is too long to fit the report heading.');
    const headers=new Set();
    function heading(){
      const p=doc.internal.getCurrentPageInfo().pageNumber;if(headers.has(p))return;headers.add(p);
      doc.setFont('Report','normal');doc.setFontSize(14);doc.setTextColor(25);doc.text(title,margin,margin+12);
      doc.setDrawColor(190);doc.line(margin,top-7,width-margin,top-7);
    }
    heading();let y=top+12;
    function paragraph(text){
      doc.setFontSize(9);doc.setTextColor(45);
      const lines=doc.splitTextToSize(text,usable);
      for(const line of lines){if(y>height-42){doc.addPage();heading();doc.setFontSize(9);y=top+12;}doc.text(line,margin,y);y+=12;}y+=5;
    }
    if(report.includeFilters!==false){
      paragraph('Applied filters');
      if(report.filters.length)for(const f of report.filters)paragraph(f.field+': '+f.value+' [Worksheets: '+f.sheets.join(', ')+']');
      else paragraph('No worksheet filters reported by Tableau.');
      y+=8;
    }
    if(y>height-80){doc.addPage();heading();y=top+12;}
    doc.setFontSize(8);const widths={};
    for(let i=0;i<report.columns.length;i++){
      const sample=[report.columns[i],...report.rows.slice(0,100).map(r=>r[i]||'')];
      widths[i]={cellWidth:Math.max(55,Math.min(160,Math.max(...sample.map(s=>doc.getTextWidth(String(s))+12))))};
    }
    const sum=Object.values(widths).reduce((s,c)=>s+c.cellWidth,0),wide=sum>usable;
    if(!wide)for(const c of Object.values(widths))c.cellWidth*=(usable-1)/sum;
    doc.autoTable({head:[report.columns],body:report.rows,startY:y,theme:'grid',showHead:'everyPage',margin:{left:margin,right:margin,top:top+12,bottom:32},styles:{font:'Report',fontStyle:'normal',fontSize:8,cellPadding:5,overflow:'linebreak',lineWidth:.3,lineColor:[215,220,225],textColor:[30,30,30]},headStyles:{fontStyle:'normal',fillColor:[43,65,84],textColor:[255,255,255]},alternateRowStyles:{fillColor:[246,248,250]},columnStyles:widths,horizontalPageBreak:wide,horizontalPageBreakRepeat:0,didDrawPage:heading});
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.setTextColor(90);doc.text('Page '+p+' of '+pages,width-margin,height-16,{align:'right'});}
    return doc;
  }
  root.PrintPDF={build};
})(globalThis);
