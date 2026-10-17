const cache=new Map<string, ReturnType<typeof createDateLabels>>();
function createDateLabels(locale: string) {
  const displayFmt=new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const displayDateFmt=new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'});
  const subFmt=new Intl.DateTimeFormat(locale,{weekday:'long',year:'numeric'});
  const monthFmt=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'});
  const shortMonth=new Intl.DateTimeFormat(locale,{month:'short'});
  const weekday=new Intl.DateTimeFormat(locale,{weekday:'short'});
  return {displayFmt,displayDateFmt,subFmt,monthFmt,
    WEEKDAYS:Array.from({length:7},(_,i)=>weekday.format(new Date(2024,0,1+i))),
    MONTHS_SHORT:Array.from({length:12},(_,i)=>shortMonth.format(new Date(2024,i,1))),
  };
}
export function dateFieldLabels(locale: string) {
  let labels=cache.get(locale);
  if(!labels){labels=createDateLabels(locale);cache.set(locale,labels);}
  return labels;
}
