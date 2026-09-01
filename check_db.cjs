const db = require('better-sqlite3')('data/seemadrishti.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(t.name, schema.map(c => c.name));
}
