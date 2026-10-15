const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const ui = path.resolve(__dirname,"..");
const output = mkdtempSync(path.join(tmpdir(),"otel-calendar-"));
after(()=>rmSync(output,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--moduleResolution","node","--skipLibCheck","--strict","--esModuleInterop","--resolveJsonModule","--jsx","react-jsx","--outDir",output,"src/components/hotel-calendar/model.ts"],{cwd:ui,stdio:"pipe"});
const { addDays, dayKey, viewRange, shiftDate, stayEvents, weekLayout, timelineLayout, calendarCSV, csvCell, guestNameList } = require(path.join(output,"components/hotel-calendar/model.js"));
const booking=(props={})=>({booking_id:"booking",branch_id:"branch",room_id:"room",guest_name:"Ayşe",guest_count:10,daily_price_minor:125050,guests:[{id:"g",name:"Ali"}],notes:"",check_in:"2026-10-12T14:00:00",check_out:"2026-10-16T11:00:00",status:"confirmed",allocations:[],...props});
const rooms=[{room_id:"room",code:"101"},{room_id:"room2",code:"102"}];
test("month navigation clamps to month start and weeks start on Monday",()=>{
 const date=new Date(2026,0,31);
 assert.equal(dayKey(shiftDate(date,"month",1)),"2026-02-01");
 assert.equal(dayKey(viewRange(new Date(2026,9,18),"week").start),"2026-10-12");
 const range=viewRange(new Date(2028,1,14),"month");
 assert.equal(dayKey(addDays(range.end,-1)),"2028-02-29");
});
test("monthly lanes separate overlapping stays and exclude a midnight checkout",()=>{
 const start=new Date(2026,9,12);
 const events=stayEvents([booking({booking_id:"a",check_out:"2026-10-14T00:00:00"}),booking({booking_id:"b",check_in:"2026-10-13T14:00:00"}),booking({booking_id:"c",check_in:"2026-10-14T14:00:00"})],rooms);
 const layout=weekLayout(events,start);
 const a=layout.find(i=>i.event.id==="a"), b=layout.find(i=>i.event.id==="b"), c=layout.find(i=>i.event.id==="c");
 assert.equal(a.from,0);assert.equal(a.to,2);
 assert.notEqual(a.lane,b.lane);assert.equal(a.lane,c.lane);
});
test("room moves preserve each segment and actual checkout truncates the stay",()=>{
 const b=booking({status:"completed",actual_check_out:"2026-10-15T10:00:00",allocations:[{allocation_id:"1",room_id:"room",start:"2026-10-12T14:00:00",end:"2026-10-14T12:00:00"},{allocation_id:"2",room_id:"room2",start:"2026-10-14T12:00:00",end:"2026-10-16T11:00:00"}]});
 const events=stayEvents([b],rooms);
 assert.deepEqual(events.map(e=>e.roomCode),["101","102"]);
 assert.equal(+events[1].end,+new Date(b.actual_check_out));
 const day=viewRange(new Date(2026,9,14),"day");
 const items=timelineLayout(events,day.start,day.end);
 assert.equal(items.length,2);assert.equal(items[0].width,50);assert.equal(items[1].left,50);
});
test("overdue checked-in guests remain visible and cancelled bookings retain their status",()=>{
 const events=stayEvents([booking({status:"checked_in"})],rooms,new Date("2026-10-18T12:00:00"));
 assert.ok(events[0].end>new Date("2026-10-18T12:00:00"));
 assert.equal(stayEvents([booking({status:"cancelled"})],rooms)[0].booking.status,"cancelled");
});
test("CSV includes occupants, price and currency, and neutralizes spreadsheet formulas",()=>{
 const csv=calendarCSV(stayEvents([booking({guest_name:'=HYPERLINK("x")'})],rooms),{confirmed:"Rezervasyon"},"TRY");
 assert.ok(csv.startsWith("\uFEFF"));assert.ok(csv.includes("1250.50"));assert.ok(csv.includes("TRY"));assert.ok(csv.includes("Ali"));
 assert.ok(csv.includes("'=HYPERLINK"));assert.equal(csvCell('a"b'), '"a""b"');assert.equal(csvCell(" +1"),'"\' +1"');
});

test("calendar occupant rows include companions and deduplicate trimmed primary names",()=>{
 assert.deepEqual(guestNameList(booking({guest_name:" Ayşe ",guests:[{name:"Ayşe"},{name:"Ali"},{name:""},{name:"  "},{name:"Ece"}]})),["Ayşe","Ali","Ece"]);
 assert.deepEqual(guestNameList(booking({guest_name:"",guests:[{name:"Ali"}]})),["Ali"]);
});
