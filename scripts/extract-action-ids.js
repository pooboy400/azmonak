// Extract server-action IDs from the __next_internal_action_entry_do_not_use__
// manifest comments embedded by Turbopack in client chunks of the login page.
const http = require("http");
function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "localhost", port: 3000, path }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}
(async () => {
  const html = await get("/portal/login");
  const urls = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
  const map = {};
  for (const u of urls) {
    const js = await get(u);
    for (const m of js.matchAll(/__next_internal_action_entry_do_not_use__\s*\[?\s*\{?"?([0-9a-f]{40,})"?:"([A-Za-z0-9_$]+)"/g)) {
      map[m[2]] = m[1];
    }
    for (const m of js.matchAll(/__next_internal_action_entry_do_not_use__\s*\[\{"([0-9a-f]{40,})":"([A-Za-z0-9_$]+)"\}/g)) {
      map[m[2]] = m[1];
    }
  }
  console.log(JSON.stringify(map, null, 2));
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
