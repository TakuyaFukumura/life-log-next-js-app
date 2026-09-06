/**
 * データベース機能のテスト
 *
 * このテストファイルは、lib/database.tsの機能をテストします。
 * テストでは実際のファイルシステムを使用しますが、テスト専用のディレクトリを作成します。
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// テスト専用のデータディレクトリ・DBパス
const testDataDir = path.join(__dirname, 'test-data');
const testDbPath = path.join(testDataDir, 'test-app.db');

// テスト用ディレクトリ・ファイル操作関数
function setupTestDir() {
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, {recursive: true});
    }
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
}

function cleanupTestDir() {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, {recursive: true, force: true});
    }
}

// pathモジュールのjoinのみモック
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: (...args: string[]): string => {
        if (args[1] === 'data' && args[2] === 'app.db') {
            return testDbPath;
        }
        return jest.requireActual('path').join(...args);
    },
}));

describe('Database Functions', () => {
    // 各テスト前の準備
    beforeEach(() => {
        setupTestDir();
        // モジュールキャッシュをリセットして、各テストで新しいインスタンスを作成
        jest.resetModules();
    });

    // 各テスト後のクリーンアップ
    afterEach(async () => {
        // データベース接続をクローズ
        try {
            const {getDatabase} = await import('../../lib/database');
            const db = getDatabase();
            if (db && db.close) db.close();
        } catch {
        }

        cleanupTestDir();
    });

    describe('getDatabase', () => {
        it('新しいデータベース接続を作成する', async () => {
            const {getDatabase} = await import('../../lib/database');
            const db = getDatabase();

            expect(db).toBeDefined();
            expect(db.open).toBe(true);
        });

        it('CSVからタグの初期データを挿入する', async () => {
            const {getDatabase} = await import('../../lib/database');
            const db = getDatabase();

            const tags = db.prepare('SELECT name FROM tags ORDER BY name').all() as { name: string }[];
            expect(tags.map((tag) => tag.name)).toEqual(expect.arrayContaining(['居住地', '仕事', '学習', '健康', '旅行']));
        });

        it('既存のデータベース接続を再利用する', async () => {
            const {getDatabase} = await import('../../lib/database');
            const db1 = getDatabase();
            const db2 = getDatabase();

            expect(db1).toBe(db2);
        });

        it('ライフログの位置情報カラムを作成する', async () => {
            const {getDatabase} = await import('../../lib/database');
            const db = getDatabase();
            const columns = db.prepare('PRAGMA table_info(lifelogs)').all() as { name: string }[];
            expect(columns.map((column) => column.name)).toEqual(expect.arrayContaining([
                'latitude', 'longitude', 'location_accuracy_meters', 'location_captured_at',
            ]));
            const migrations = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {version: number}[];
            expect(migrations.map((migration) => migration.version)).toEqual([1, 2]);
        });

        it('既存データベースに未適用のマイグレーションを適用する', async () => {
            const legacyDatabase = new Database(testDbPath);
            legacyDatabase.exec(`
                CREATE TABLE lifelogs (
                    id TEXT PRIMARY KEY NOT NULL,
                    body TEXT NOT NULL,
                    occurred_at TEXT NOT NULL,
                    timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT
                );
                CREATE TABLE tags (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE lifelog_tags (
                    lifelog_id TEXT NOT NULL,
                    tag_id TEXT NOT NULL,
                    PRIMARY KEY (lifelog_id, tag_id)
                );
            `);
            legacyDatabase.close();

            const {getDatabase} = await import('../../lib/database');
            const db = getDatabase();
            const columns = db.prepare('PRAGMA table_info(lifelogs)').all() as {name: string}[];
            expect(columns.map((column) => column.name)).toEqual(expect.arrayContaining([
                'latitude', 'longitude', 'location_accuracy_meters', 'location_captured_at',
            ]));
        });
    });

    describe('Database Integration', () => {
        it('データベースファイルが存在することを確認する', async () => {
            const {getDatabase} = await import('../../lib/database');
            getDatabase();

            expect(fs.existsSync(testDbPath)).toBe(true);
        });

    });
});
