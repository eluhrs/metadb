const fs = require('fs');
fetch('http://localhost:3000/api/collections/9dc79980-d106-42bc-9ca5-13dff9024f1a/export', {
  headers: {
    // We need to bypass auth for a moment.
  }
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Headers:", Object.fromEntries(r.headers.entries()));
  const text = await r.text();
  console.log("Body preview:", text.substring(0, 200));
})
