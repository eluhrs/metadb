const fs = require('fs');

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
  
  // Nuke ALL path.join(process.cwd(), ...) entirely!
  // path.join(/*turbopackIgnore: true*/ process.cwd(), '.next', 'cache', 'tiles')
  content = content.replace(/path\.join\(\/\*turbopackIgnore:\s*true\*\/\s*process\.cwd\(\)\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\)/g, "`${process.cwd()}/$1/$2/$3`");
  // For the `upload` route specific
  content = content.replace(/path\.join\(\/\*turbopackIgnore:\s*true\*\/\s*process\.cwd\(\)\s*,\s*"public\/uploads"\s*,\s*collectionId\)/g, "`${process.cwd()}/public/uploads/${collectionId}`");

  // Just to be safe, replace the [...pathArray] for tiles dynamically too:
  content = content.replace(/path\.join\(\/\*turbopackIgnore:\s*true\*\/\s*process\.cwd\(\)\s*,\s*'\.next'\s*,\s*'cache'\s*,\s*'tiles'\s*,\s*\.\.\.pathArray\)/g, "`${process.cwd()}/.next/cache/tiles/${pathArray.join('/')}`");

  fs.writeFileSync(file, content);
  console.log(`Nativized ${file}`);
});
