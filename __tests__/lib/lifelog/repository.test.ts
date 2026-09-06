import Database from 'better-sqlite3';
import {getDatabase} from '../../../lib/database';
import {
    createLifeLog,
    deleteLifeLog,
    getLifeLog,
    listLifeLogs,
    listMapLifeLogs,
    listTrash,
    permanentlyDeleteLifeLog,
    restoreLifeLog,
    updateLifeLog,
} from '../../../lib/lifelog/repository';

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

    it('creates and updates a log with tags and location', () => {
        database.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('tag-1', '仕事', 'now', 'now');

        const created = createLifeLog({
            body: '作業を開始した',
            occurredAt: '2026-09-05T01:00:00.000Z',
            tagIds: ['tag-1'],
            newTagNames: ['重要', '重要'],
            location: {latitude: 35.681, longitude: 139.767, accuracyMeters: 12, capturedAt: '2026-09-05T01:00:00.000Z'},
        });

        expect(created.body).toBe('作業を開始した');
        expect(created.tags.map((tag) => tag.name)).toEqual(['仕事', '重要']);
        expect(created.location).toMatchObject({latitude: 35.681, longitude: 139.767, accuracyMeters: 12});

        const updated = updateLifeLog(created.id, {
            body: '作業を完了した',
            newTagNames: ['完了'],
            location: null,
        });

        expect(updated).toMatchObject({id: created.id, body: '作業を完了した', location: null});
        expect(updated?.tags.map((tag) => tag.name)).toEqual(['完了']);
    });

    it('rejects unknown tags and keeps the transaction unchanged', () => {
        expect(() => createLifeLog({body: '不正なタグ', tagIds: ['missing-tag']})).toThrow('指定されたタグが見つかりません');
        expect(database.prepare('SELECT COUNT(*) AS count FROM lifelogs').get()).toEqual({count: 0});
    });

    it('paginates active logs and excludes deleted logs', () => {
        for (let index = 0; index < 21; index++) {
            const item = createLifeLog({
                body: `記録 ${index}`,
                occurredAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
            });
            if (index === 0) deleteLifeLog(item.id);
        }

        const firstPage = listLifeLogs(1);
        const secondPage = listLifeLogs(2);

        expect(firstPage.items).toHaveLength(20);
        expect(secondPage.items).toHaveLength(0);
        expect(firstPage.totalItems).toBe(20);
        expect(firstPage.totalPages).toBe(1);
        expect(firstPage.items.every((item) => item.deletedAt === null)).toBe(true);
    });

    it('lists, restores, and permanently deletes trash items', () => {
        const item = createLifeLog({body: '削除対象'});
        expect(deleteLifeLog(item.id)).toBe(true);
        expect(getLifeLog(item.id)).toBeUndefined();
        expect(getLifeLog(item.id, true)?.deletedAt).not.toBeNull();

        expect(listTrash()).toMatchObject({totalItems: 1, totalPages: 1});
        const restored = restoreLifeLog(item.id);
        expect(restored).toMatchObject({id: item.id, deletedAt: null});
        expect(listTrash().totalItems).toBe(0);

        expect(deleteLifeLog(item.id)).toBe(true);
        expect(permanentlyDeleteLifeLog(item.id)).toBe(true);
        expect(getLifeLog(item.id, true)).toBeUndefined();
        expect(permanentlyDeleteLifeLog(item.id)).toBe(false);
    });

    it('filters map logs by location, tag, and date range and truncates at 100 items', () => {
        database.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('tag-1', '旅行', 'now', 'now');
        const inRange = createLifeLog({
            body: '東京駅で集合',
            occurredAt: '2026-09-05T00:00:00.000Z',
            tagIds: ['tag-1'],
            location: {latitude: 35.681, longitude: 139.767, capturedAt: '2026-09-05T00:00:00.000Z'},
        });
        createLifeLog({
            body: '範囲外',
            occurredAt: '2026-09-01T00:00:00.000Z',
            tagIds: ['tag-1'],
            location: {latitude: 35, longitude: 139, capturedAt: '2026-09-01T00:00:00.000Z'},
        });
        createLifeLog({body: '位置なし', occurredAt: '2026-09-05T00:00:00.000Z', tagIds: ['tag-1']});

        const filtered = listMapLifeLogs({
            tagId: 'tag-1',
            from: '2026-09-05T00:00:00.000Z',
            to: '2026-09-05T23:59:59.999Z',
        });
        expect(filtered).toMatchObject({truncated: false});
        expect(filtered.items).toHaveLength(1);
        expect(filtered.items[0]).toMatchObject({id: inRange.id, bodyPreview: '東京駅で集合'});

        for (let index = 0; index < 101; index++) {
            createLifeLog({
                body: `地図 ${index}`,
                location: {latitude: 35, longitude: 139, capturedAt: '2026-09-06T00:00:00.000Z'},
            });
        }
        expect(listMapLifeLogs()).toMatchObject({truncated: true});
        expect(listMapLifeLogs().items).toHaveLength(100);
    });
});
