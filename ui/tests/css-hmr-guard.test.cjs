const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const guard=require('../scripts/css-hmr-guard.cjs');
const source=fs.readFileSync(require.resolve('next/dist/compiled/mini-css-extract-plugin/hmr/hotModuleReplacement.js'),'utf8');
for(const event of ['load','error'])for(const detached of [false,true])test(`CSS HMR ${event}, old link detached: ${detached}`,()=>{
 const callbacks={};let timer;let removals=0;
 const parent={appendChild(){},removeChild(link){removals++;link.parentNode=null;}};
 const link={href:'http://localhost/app.css',parentNode:parent,cloneNode(){return {addEventListener(name,fn){callbacks[name]=fn;}};},remove(){if(this.parentNode)this.parentNode.removeChild(this);}};
 const context={module:{exports:{}},__dirname:'',console:{log(){}},document:{querySelectorAll(){return [link];},getElementsByTagName(){return [];},currentScript:null},setTimeout(fn){timer=fn;return 1;},clearTimeout(){}};
 vm.runInNewContext(guard(source),context);
 context.module.exports('test',{})();timer();
 if(detached)link.remove();
 assert.doesNotThrow(()=>callbacks[event]());
 assert.doesNotThrow(()=>callbacks[event]());
 assert.equal(removals,1);
});
