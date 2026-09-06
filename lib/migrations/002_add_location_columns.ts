import type Database from 'better-sqlite3';

export const version = 2;

const columns = [
    ['latitude', 'REAL'],
    ['longitude', 'REAL'],
    ['location_accuracy_meters', 'REAL'],
    ['location_captured_at', 'TEXT'],
] as const;

export function up(database: Database.Database): void {
    const existingColumns = new Set(
        (database.prepare('PRAGMA table_info(lifelogs)').all() as {name: string}[]).map((column) => column.name),
    );

    for (const [name, type] of columns) {
        if (!existingColumns.has(name)) {
            database.exec(`ALTER TABLE lifelogs ADD COLUMN ${name} ${type}`);
        }
    }
}
