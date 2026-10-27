export async function* sseEvents(body:AsyncIterable<Uint8Array>): AsyncGenerator<any> {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer = (buffer + decoder.decode(chunk,{stream:true})).replace(/\r\n/g,'\n');
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0,index); buffer = buffer.slice(index+2);
      const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') continue;
      yield JSON.parse(data);
    }
  }
  buffer += decoder.decode();
  const last = buffer.trim().split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
  if (last && last !== '[DONE]') yield JSON.parse(last);
}
