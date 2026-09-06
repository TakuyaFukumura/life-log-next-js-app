import Database from 'better-sqlite3';
import {join} from 'path';
import fs from 'fs';
import {runMigrations} from './migrations';

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

        runMigrations(db);
        seedTagsFromCsv(db);
    }

    return db;
}
