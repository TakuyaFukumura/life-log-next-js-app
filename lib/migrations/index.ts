import type Database from 'better-sqlite3';
import * as initialSchema from './001_initial_schema';
import * as addLocationColumns from './002_add_location_columns';

type Migration = {
    version: number;
    up: (database: Database.Database) => void;
};

const migrations: Migration[] = [initialSchema, addLocationColumns];

export function runMigrations(database: Database.Database): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        )
    `);

    for (const migration of migrations) {
        database.transaction(() => {
            const applied = database
                .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
                .get(migration.version);
            if (applied) return;

            migration.up(database);
            database
                .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
                .run(migration.version, new Date().toISOString());
        })();
    }
}
