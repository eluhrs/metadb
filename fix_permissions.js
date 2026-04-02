const fs = require('fs');

const files = [
  'src/app/api/images/proxy/[slug]/route.ts',
  'src/app/api/images/proxy/route.ts',
  'src/app/api/collections/[id]/fields/route.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the isolated cache destination mapping exclusively to dodge Docker immutable volume ownership locks
  content = content.replace(/\$\{process\.cwd\(\)\}\/\.next\/cache\/metadb-images/g, "/tmp/metadb-images");

  fs.writeFileSync(file, content);
  console.log(`Secured ${file}`);
});
