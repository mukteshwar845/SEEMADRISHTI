import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'seemadrishti.sqlite');
const db = new DatabaseSync(dbPath);

try {
  console.log('Adding class_name to movement_events if missing...');
  db.exec("ALTER TABLE movement_events ADD COLUMN class_name TEXT NOT NULL DEFAULT 'person';");
  console.log('Success!');
} catch (e: any) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists.');
  } else {
    console.error('Error:', e.message);
  }
}

try {
  console.log('Adding class_name to target_handovers if missing...');
  db.exec("ALTER TABLE target_handovers ADD COLUMN class_name TEXT DEFAULT 'person';");
  console.log('Success!');
} catch (e: any) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists.');
  } else {
    console.error('Error:', e.message);
  }
}

try {
  console.log('Adding class_name to behavior_chains if missing...');
  db.exec("ALTER TABLE behavior_chains ADD COLUMN class_name TEXT DEFAULT 'person';");
  console.log('Success!');
} catch (e: any) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists.');
  } else {
    console.error('Error:', e.message);
  }
}

db.close();
