const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function detectUrls(text) {
  if (!text) return [];
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  const regex = new RegExp(URL_REGEX);
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    let url = match[0];
    let href = url;
    
    if (url.startsWith('www.')) {
      href = 'https://' + url;
    }
    
    parts.push({
      type: 'url',
      content: url,
      href: href
    });
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
