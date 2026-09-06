import Database from 'better-sqlite3';
import {join} from 'path';
import fs from 'fs';

type TagSeedRow = { name: string };

function seedTagsFromCsv(database: Database.Database) {
    const csvPath = join(process.cwd(), 'config', 'tags.csv');
    const contents = fs.readFileSync(csvPath, 'utf8');
    const lines = contents.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines[0] !== 'name') throw new Error('タグCSVのヘッダーは name である必要があります');

    const insert = database.prepare(`
        INSERT INTO tags (id, name, created_at, updated_at)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?)
    `);
    const find = database.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
    const now = new Date().toISOString();
    const seed = database.transaction((rows: TagSeedRow[]) => {
        for (const row of rows) {
            if (!find.get(row.name)) insert.run(row.name, now, now);
        }
    });
    seed(lines.slice(1).map((name) => ({name})));
}

// データベースファイルのパス
const dbPath = join(process.cwd(), 'data', 'app.db');

// データベースインスタンス
let db: Database.Database | null = null;

/**
 * データベース接続を取得する
 */
export function getDatabase(): Database.Database {
    if (!db) {
        // データベースディレクトリが存在しない場合は作成
        const dataDir = join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, {recursive: true});
        }

        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');

        db.exec(`
            CREATE TABLE IF NOT EXISTS lifelogs (
                id TEXT PRIMARY KEY NOT NULL,
                body TEXT NOT NULL,
                occurred_at TEXT NOT NULL,
                timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT,
                latitude REAL,
                longitude REAL,
                location_accuracy_meters REAL,
                location_captured_at TEXT
            );
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS lifelog_tags (
                lifelog_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (lifelog_id, tag_id),
                FOREIGN KEY (lifelog_id) REFERENCES lifelogs(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_lifelogs_list
                ON lifelogs (deleted_at, occurred_at DESC, id DESC);
            CREATE INDEX IF NOT EXISTS idx_lifelogs_updated_at ON lifelogs (updated_at);
            CREATE INDEX IF NOT EXISTS idx_lifelog_tags_tag_id ON lifelog_tags (tag_id, lifelog_id);
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const columns = db.prepare('PRAGMA table_info(lifelogs)').all() as { name: string }[];
        const existingColumns = new Set(columns.map((column) => column.name));
        const migrations = [
            ['latitude', 'REAL'],
            ['longitude', 'REAL'],
            ['location_accuracy_meters', 'REAL'],
            ['location_captured_at', 'TEXT'],
        ] as const;
        for (const [name, type] of migrations) {
            if (!existingColumns.has(name)) db.exec(`ALTER TABLE lifelogs ADD COLUMN ${name} ${type}`);
        }

        seedTagsFromCsv(db);
    }

    return db;
}

/**
 * メッセージを取得する
 */
export function getMessage(): string {
    const database = getDatabase();
    const result = database.prepare('SELECT content FROM messages ORDER BY created_at DESC, id DESC LIMIT 1').get() as {
        content: string
    } | undefined;
    return result?.content || '';
}
