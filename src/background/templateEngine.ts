export function renderTemplate(template: string, variables: Record<string, string> = {}): string {
  let rendered = template;
  
  // Replace {{variable}} with actual values
  // e.g., {{firstName}}, {{ company }}
  const matches = rendered.match(/\{\{([^}]+)\}\}/g);
  
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, '').trim();
      
      // Look for the key in variables (case insensitive match for convenience)
      const varKey = Object.keys(variables).find(k => k.toLowerCase() === key.toLowerCase());
      
      const value = varKey ? variables[varKey] : ''; // Default to empty string if not found
      rendered = rendered.replace(match, value);
    });
  }
  
  return rendered;
}
