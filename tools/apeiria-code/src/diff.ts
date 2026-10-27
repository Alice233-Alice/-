/** Recover a before view from a completed unified patch without modifying the workspace. */
export function beforeFromDiff(after:string,diff:string):string|null{
  const lines=after.replace(/\r\n/g,'\n').split('\n');
  const hunks:{start:number;added:number;old:string[]}[]=[];
  let hunk:typeof hunks[number]|undefined;
  for(const line of diff.replace(/\r\n/g,'\n').split('\n')){
    const m=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if(m){const added=m[2]===undefined?1:Number(m[2]);hunk={start:Math.max(0,Number(m[1])-(added===0?0:1)),added,old:[]};hunks.push(hunk);continue;}
    if(hunk&&(line.startsWith(' ')||line.startsWith('-')))hunk.old.push(line.slice(1));
  }
  if(!hunks.length)return null;
  for(const h of hunks.reverse())lines.splice(h.start,h.added,...h.old);
  return lines.join('\n');
}
