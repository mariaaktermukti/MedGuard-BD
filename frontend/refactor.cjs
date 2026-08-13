const fs = require('fs');
const path = require('path');

const replacements = {
  'var(--primary-color)': 'var(--primary)',
  'var(--primary-hover)': 'var(--primary-hover)',
  'var(--bg-dark)': 'var(--bg-page)',
  'var(--text-light)': 'var(--text-main)',
  'var(--border-color)': 'var(--border)',
  'var(--danger)': 'var(--danger)',
  'var(--success)': 'var(--success)',
  'var(--warning)': 'var(--warning)',
  'var(--success-color)': 'var(--success)',
  'var(--alert-red)': 'var(--danger)',
  'var(--trust-blue)': 'var(--primary)',
  'var(--safety-green)': 'var(--success)',
  'btn-primary': 'ui-btn ui-btn-primary',
  'btn-danger': 'ui-btn ui-btn-danger',
  'btn-secondary': 'ui-btn ui-btn-secondary',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  for (const [oldVal, newVal] of Object.entries(replacements)) {
    // Escape for regex if needed, but simple string replaceAll is fine in modern node
    content = content.split(oldVal).join(newVal);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Updated:', file);
  }
});

console.log(`Refactored ${modifiedCount} files.`);
