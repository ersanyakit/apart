"use client";
import React,{useState} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';
import {chartsFor,chartPoints,pivotData,type ChartSpec,type Point} from './charts';
import {display,type Row,type ReportResult} from './model';
import styles from './ReportCharts.module.css';
const colors=['var(--color-brand-blue-500)','#16a085','#f59e0b','#8b5cf6','#e76f51','#06b6d4','#ec4899','#64748b','#84a344','#a78bfa','#f97316','#475569'];
const names={line:'Zaman grafiği',bar:'Karşılaştırma grafiği',donut:'Dağılım grafiği',pivot:'Pivot görünüm',funnel:'Aşama grafiği'};
export function ReportCharts({report}:{report:ReportResult}){return <div className={styles.grid}>{chartsFor(report).map(({spec,rows},i)=><ChartCard key={`${report.key}-${i}`} spec={spec} rows={rows} currency={report.currency}/>)}</div>}
export function ChartCard({spec,rows,currency}:{spec:ChartSpec;rows:Row[];currency:string}){
 const points=chartPoints(rows,spec);const [expanded,setExpanded]=useState(false);const hasMoney=spec.values.some(v=>v.format==='money');
 const hasData=rows.length>0&&points.some(p=>p.values.some(v=>v!==null&&v!==0));
 return <section className={styles.card} aria-label={spec.title} data-chart-kind={spec.kind}>
  <div className={styles.heading}><div><p className={styles.eyebrow}>{names[spec.kind]}{hasMoney?` · ${currency}`:''}</p><h3>{spec.title}</h3><p className={styles.explanation}>{spec.explanation}</p></div></div>
  {!hasData?<div className={styles.empty}><span aria-hidden="true">—</span><strong>Bu dönemde grafiğe yansıyacak hareket yok</strong><p>Farklı bir dönem seçebilir veya ilgili işlem kaydını ekleyebilirsiniz. Sıfır değerler detay tablosunda korunur.</p></div>:
   spec.kind==='donut'?<Donut points={points} spec={spec} currency={currency}/>:
   spec.kind==='line'?<LineChart points={points} spec={spec} currency={currency}/>:
   spec.kind==='pivot'?<Pivot rows={rows} spec={spec} currency={currency}/>:
   <Bars points={points} spec={spec} currency={currency} funnel={spec.kind==='funnel'}/>}
  {hasData&&spec.kind!=='pivot'&&<div className={styles.details}><button className="uni-button uni-button-secondary" type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}Grafik değerlerini {expanded?'gizle':'göster'}</button>{expanded&&<ValueTable points={points} spec={spec} currency={currency}/>}</div>}
 </section>;
}
function ValueTable({points,spec,currency}:{points:Point[];spec:ChartSpec;currency:string}){return <div className={styles.scroll}><table className={styles.values}><caption className="sr-only">{spec.title} değerleri</caption><thead><tr><th scope="col">Grup</th>{spec.values.map(v=><th key={v.key} scope="col">{v.label}</th>)}</tr></thead><tbody>{points.map(p=><tr key={p.key??p.label}><th scope="row">{p.label}</th>{p.values.map((v,i)=><td key={i}>{display(v,spec.values[i].format,currency)}</td>)}</tr>)}</tbody></table></div>}
function Donut({points,spec,currency}:{points:Point[];spec:ChartSpec;currency:string}){
 const slices=points.filter(p=>(p.values[0]??0)>0),total=slices.reduce((s,p)=>s+(p.values[0]??0),0);const [active,setActive]=useState<number|null>(null);const circumference=2*Math.PI*82;let consumed=0;
 return <div className={styles.donutLayout}><div className={styles.donut}><svg viewBox="0 0 230 230" role="img" aria-label={`${spec.title}: ${slices.length} grup, toplam ${display(total,spec.values[0].format,currency)}`}>
  <circle cx="115" cy="115" r="82" fill="none" stroke="currentColor" strokeWidth="26" className={styles.track}/>
  {slices.map((p,i)=>{const value=p.values[0]??0,length=value/total*circumference,offset=-consumed;consumed+=length;return <circle key={p.key??p.label} cx="115" cy="115" r="82" fill="none" stroke={colors[i%colors.length]} strokeWidth={active===i?32:26} strokeDasharray={`${Math.max(0,length-2)} ${circumference}`} strokeDashoffset={offset} transform="rotate(-90 115 115)" opacity={active===null||active===i?1:.35}><title>{`${p.label}: ${display(value,spec.values[0].format,currency)} (${(value/total*100).toFixed(1)}%)`}</title></circle>})}
 </svg><div className={styles.donutCenter}><small>{active===null?'Toplam':slices[active]?.label}</small><strong>{display(active===null?total:slices[active]?.values[0],spec.values[0].format,currency)}</strong></div></div>
 <ul className={styles.legend}>{slices.map((p,i)=><li key={p.key??p.label}><button type="button" className={styles.legendButton} aria-pressed={active===i} onClick={()=>setActive(active===i?null:i)} onFocus={()=>setActive(i)} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} onBlur={()=>setActive(null)}><span className={styles.swatch} style={{background:colors[i%colors.length]}}/><span className={styles.legendName}>{p.label}</span><span className={styles.legendValue}>{display(p.values[0],spec.values[0].format,currency)}<small>{((p.values[0]??0)/total*100).toLocaleString('tr-TR',{maximumFractionDigits:1})}%</small></span></button></li>)}</ul>
 </div>
}
function Bars({points,spec,currency,funnel}:{points:Point[];spec:ChartSpec;currency:string;funnel:boolean}){
 const max=Math.max(1,...points.flatMap(p=>p.values.map(v=>Math.abs(v??0))));
 return <div className={styles.barBody}>
  {spec.values.length>1&&<div className={styles.seriesLegend}>{spec.values.map((v,i)=><span key={v.key}><i style={{background:colors[i]}}/>{v.label}</span>)}</div>}
  {points.map(p=><div key={p.key??p.label} className={styles.barRow}><span className={styles.barLabel}>{p.label}</span><div className={styles.barSeries}>{p.values.map((value,i)=><div key={i} className={styles.barValueRow}><div className={styles.barTrack}><div className={styles.barFill} style={{width:`${Math.abs(value??0)/max*100}%`,background:colors[i%colors.length],marginInline:funnel?'auto':undefined,opacity:value===null?0:1}}/></div><strong>{display(value,spec.values[i].format,currency)}</strong></div>)}</div></div>)}
 </div>
}
function LineChart({points,spec,currency}:{points:Point[];spec:ChartSpec;currency:string}){
 const [active,setActive]=useState<number|null>(null);const [visible,setVisible]=useState(spec.values.map(()=>true));
 const all=points.flatMap(p=>p.values.filter((_,i)=>visible[i]).map(v=>v??0)),max=Math.max(1,...all),min=Math.min(0,...all),span=max-min||1;
 const x=(i:number)=>72+(points.length===1?300:i/(points.length-1)*600),y=(v:number)=>225-(v-min)/span*185;
 const axis=(v:number)=>new Intl.NumberFormat('tr-TR',{notation:'compact',maximumFractionDigits:1}).format(spec.values[0].format==='money'?v/100:v)+(spec.values[0].format==='percent'?'%':'');
 const selected=active===null?points[points.length-1]:points[active];
 return <div className={styles.lineBody}><div className={styles.seriesLegend}>{spec.values.map((v,i)=><button type="button" key={v.key} className={styles.seriesButton} aria-pressed={visible[i]} onClick={()=>setVisible(old=>old.map((on,j)=>i===j?!on:on))}><i style={{background:colors[i],opacity:visible[i]?1:.25}}/>{v.label}</button>)}</div>
  <div className={styles.lineSummary} aria-live="polite"><span>{selected?.label}</span>{spec.values.map((v,i)=>visible[i]&&<strong key={v.key} style={{color:colors[i]}}>{v.label}: {display(selected?.values[i],v.format,currency)}</strong>)}</div>
  <svg viewBox="0 0 720 265" className={styles.lineSvg} role="img" aria-label={`${spec.title}. Değerler grafiğin altındaki açılır tabloda da bulunur.`}>
   {Array.from({length:5},(_,i)=>{const v=min+span*i/4;return <g key={i}><line x1="72" x2="672" y1={y(v)} y2={y(v)} stroke="currentColor" className={styles.gridLine}/><text x="62" y={y(v)+4} textAnchor="end" className={styles.axisText}>{axis(v)}</text></g>})}
   {spec.values.map((v,j)=>visible[j]&&<g key={v.key}><polyline points={points.map((p,i)=>`${x(i)},${y(p.values[j]??0)}`).join(' ')} stroke={colors[j]} fill="none" strokeWidth="2.5" strokeLinejoin="round"/>{points.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.values[j]??0)} r={active===i?5:points.length>60?2:3} fill={colors[j]}><title>{`${p.label} · ${v.label}: ${display(p.values[j],v.format,currency)}`}</title></circle>)}</g>)}
   {points.map((p,i)=><rect key={i} x={x(i)-Math.max(4,300/Math.max(1,points.length))} y="28" width={Math.max(8,600/Math.max(1,points.length))} height="206" fill="transparent" onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)}><title>{p.label}</title></rect>)}
   {Array.from(new Set([0,Math.floor((points.length-1)/4),Math.floor((points.length-1)/2),Math.floor((points.length-1)*3/4),points.length-1])).map(i=><text key={i} x={x(i)} y="252" textAnchor="middle" className={styles.axisText}>{points[i].label}</text>)}
  </svg>
 </div>
}
function Pivot({rows,spec,currency}:{rows:Row[];spec:ChartSpec;currency:string}){
 const data=pivotData(rows,spec),[limit,setLimit]=useState(12);const peaks=data.columns.map((_,i)=>Math.max(1,...data.rows.map(r=>Math.abs(r.values[i]??0))));
 return <div className={styles.pivotBody}><div className={styles.scroll}><table className={styles.pivot}><caption className="sr-only">{spec.title}</caption><thead><tr><th scope="col">Karşılaştırma</th>{data.columns.map(col=><th scope="col" key={col}>{col}</th>)}</tr></thead><tbody>{data.rows.slice(0,limit).map((r,index)=><tr key={index}><th scope="row">{r.label}</th>{r.values.map((value,i)=><td key={i} style={{background:`color-mix(in srgb, var(--color-brand-blue-500) ${Math.min(27,Math.abs(value??0)/peaks[i]*27)}%, transparent)`}}>{display(value,data.formats[i],currency)}</td>)}</tr>)}</tbody></table></div>
 {data.rows.length>12&&<button type="button" className="uni-button uni-button-secondary" onClick={()=>setLimit(limit===12?data.rows.length:12)}>{limit===12?`${data.rows.length} satırın tamamını göster`:'İlk 12 satırı göster'}</button>}<p className={styles.pivotHint}>Daha koyu hücre, aynı sütunda daha yüksek değeri gösterir. Farklı ölçüler birbiriyle toplanmaz.</p></div>
}
