import Database from 'better-sqlite3';
import {getDatabase} from '../../../lib/database';
import {listLifeLogs, listMapLifeLogs} from '../../../lib/lifelog/repository';

jest.mock('../../../lib/database', () => ({
    getDatabase: jest.fn(),
}));

const mockedGetDatabase = jest.mocked(getDatabase);

describe('lifelog repository list queries', () => {
    let database: Database.Database;

    beforeEach(() => {
        database = new Database(':memory:');
        database.exec(`
            CREATE TABLE lifelogs (
                id TEXT PRIMARY KEY,
                body TEXT NOT NULL,
                occurred_at TEXT NOT NULL,
                timezone TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT,
                latitude REAL,
                longitude REAL,
                location_accuracy_meters REAL,
                location_captured_at TEXT
            );
            CREATE TABLE tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE lifelog_tags (
                lifelog_id TEXT NOT NULL,
                tag_id TEXT NOT NULL
            );
        `);
        mockedGetDatabase.mockReturnValue(database);
    });

    afterEach(() => {
        database.close();
        jest.restoreAllMocks();
        mockedGetDatabase.mockReset();
    });

    it('loads tags for a page with one tag query instead of one query per log', () => {
        database.prepare(`
            INSERT INTO lifelogs (
                id, body, occurred_at, timezone, created_at, updated_at,
                latitude, longitude, location_captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('log-1', 'first', '2026-09-01T00:00:00.000Z', 'Asia/Tokyo', 'now', 'now', null, null, null);
        database.prepare(`
            INSERT INTO lifelogs (
                id, body, occurred_at, timezone, created_at, updated_at,
                latitude, longitude, location_captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('log-2', 'second', '2026-09-02T00:00:00.000Z', 'Asia/Tokyo', 'now', 'now', null, null, null);
        database.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('tag-1', '仕事', 'now', 'now');
        database.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('tag-2', '学習', 'now', 'now');
        database.prepare('INSERT INTO lifelog_tags VALUES (?, ?)').run('log-1', 'tag-1');
        database.prepare('INSERT INTO lifelog_tags VALUES (?, ?)').run('log-2', 'tag-2');

        const prepare = jest.spyOn(database, 'prepare');
        const result = listLifeLogs();

        expect(result.items.map((item) => item.tags.map((tag) => tag.name))).toEqual([['学習'], ['仕事']]);
        expect(prepare.mock.calls.filter(([sql]) => sql.includes('FROM tags t'))).toHaveLength(1);
    });

    it('loads map tags in one batch', () => {
        database.prepare(`
            INSERT INTO lifelogs (
                id, body, occurred_at, timezone, created_at, updated_at,
                latitude, longitude, location_captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('log-1', 'first', '2026-09-01T00:00:00.000Z', 'Asia/Tokyo', 'now', 'now', 35, 139, 'now');
        database.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('tag-1', '仕事', 'now', 'now');
        database.prepare('INSERT INTO lifelog_tags VALUES (?, ?)').run('log-1', 'tag-1');

        const prepare = jest.spyOn(database, 'prepare');
        const result = listMapLifeLogs();

        expect(result.items[0].tags.map((tag) => tag.name)).toEqual(['仕事']);
        expect(prepare.mock.calls.filter(([sql]) => sql.includes('FROM tags t'))).toHaveLength(1);
    });
});
