const fs = require('fs');
const glob = require('glob');

const files = [
  'src/app/api/records/ai/route.ts',
  'src/app/api/images/proxy/route.ts',
  'src/app/api/images/proxy/[slug]/route.ts',
  'src/app/api/tiles/[...path]/route.ts',
  'src/app/api/collections/[id]/cache/route.ts',
  'src/app/api/collections/[id]/route.ts',
  'src/app/api/collections/[id]/fields/route.ts',
  'src/app/api/upload/route.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Specifically fix NextJS Turbopack AST bloat by ignoring the AST parser!
  content = content.replace(/path\.join\(\s*process\.cwd\(\)\s*,([^)]+)\)/g, (match, pathArgs) => {
    return `path.join(/*turbopackIgnore: true*/ process.cwd(), ${pathArgs.trim()})`;
  });

  fs.writeFileSync(file, content);
  console.log(`Patched ${file}`);
});
