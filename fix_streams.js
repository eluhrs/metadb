const fs = require('fs');

const files = [
  'src/app/api/images/proxy/[slug]/route.ts',
  'src/app/api/images/proxy/route.ts',
  'src/app/api/collections/[id]/fields/route.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace stream fetching with native arraybuffer
  content = content.replace(/responseType:\s*'stream'/g, "responseType: 'arraybuffer'");
  
  // Replace chunk iteration
  content = content.replace(/const chunks(?:.*?)for await(?:.*?)\s*chunks\.push.*?\}\s*const buffer = Buffer\.concat\(chunks\);/gs, "const buffer = Buffer.from(response.data as ArrayBuffer);");

  fs.writeFileSync(file, content);
  console.log(`Patched ${file}`);
});
