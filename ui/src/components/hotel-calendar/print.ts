const escape = (text: string) => text.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]!));

/** Print the visible, filtered calendar; browsers can save the result as PDF. */
export function printCalendar(element: HTMLElement, title: string) {
  const frame=document.createElement("iframe");
  frame.title="Takvim yazdırma";
  frame.style.cssText="position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
  const styles=Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link=>`<link rel="stylesheet" href="${escape(link.href)}">`).join("");
  const inlineStyles=Array.from(document.querySelectorAll("style")).map(style=>`<style>${style.textContent ?? ""}</style>`).join("");
  frame.onload=async()=>{
    const win=frame.contentWindow;
    if(!win)return;
    await win.document.fonts.ready;
    win.addEventListener("afterprint",()=>frame.remove(),{once:true});
    win.focus();win.print();
  };
  frame.srcdoc=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escape(title)}</title>${styles}${inlineStyles}<style>@page{size:A4 landscape;margin:10mm}body{background:white!important;color:#172033;font-family:Arial,sans-serif}h1{font-size:18px;margin:0 0 16px}.hc-scroll{overflow:visible!important}.hc-month,.hc-timeline{min-width:0!important}.hc-month-week,.hc-timeline-row{break-inside:avoid}.hc-event{box-shadow:none!important}.hc-room-label,.hc-room-heading{width:100px;min-width:100px}.hc-event-title{font-size:9px}.hc-event-meta{font-size:8px}.hc-ticks{font-size:8px}.hc-legend small{display:none}.hc-summary{padding:12px 0}.hc{border:0!important}button{color:inherit;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><h1>${escape(title)}</h1><div class="hc">${element.innerHTML}</div></body></html>`;
  document.body.appendChild(frame);
}
