import type Database from 'better-sqlite3';

export const version = 1;

export function up(database: Database.Database): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS lifelogs (
            id TEXT PRIMARY KEY NOT NULL,
            body TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
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
    `);
}
