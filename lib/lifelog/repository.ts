import {randomUUID} from 'crypto';
import type Database from 'better-sqlite3';
import {getDatabase} from '../database';
import type {CreateLifeLogInput, LifeLog, Tag, UpdateLifeLogInput} from '../../src/domain/lifelog';
import {assertValidInput, normalizeOccurredAt, ValidationError} from '../../src/domain/validation';

type Row = {
    id: string; body: string; occurred_at: string; timezone: string;
    created_at: string; updated_at: string; deleted_at: string | null;
    latitude: number | null; longitude: number | null;
    location_accuracy_meters: number | null; location_captured_at: string | null;
};
type TagRow = { id: string; name: string; created_at: string; updated_at: string };

export type ImportLifeLogsResult = {
    imported: number;
    skipped: number;
    invalid: number;
};

function tagFromRow(row: TagRow): Tag {
    return {id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at};
}

function toLifeLog(database: Database.Database, row: Row): LifeLog {
    const tags = database.prepare(`
        SELECT t.id, t.name, t.created_at, t.updated_at FROM tags t
        JOIN lifelog_tags lt ON lt.tag_id = t.id WHERE lt.lifelog_id = ? ORDER BY t.name
    `).all(row.id) as TagRow[];
    return {
        id: row.id, body: row.body, occurredAt: row.occurred_at, timezone: 'Asia/Tokyo',
        tags: tags.map(tagFromRow), createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at,
        location: row.latitude !== null && row.longitude !== null && row.location_captured_at !== null ? {
            latitude: row.latitude,
            longitude: row.longitude,
            accuracyMeters: row.location_accuracy_meters,
            capturedAt: row.location_captured_at,
        } : null,
    };
}

function getRow(database: Database.Database, id: string, includeDeleted = false): Row | undefined {
    return database.prepare(`SELECT * FROM lifelogs WHERE id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`).get(id) as Row | undefined;
}

function resolveTags(database: Database.Database, tagIds: string[] = [], newTagNames: string[] = [], now: string): string[] {
    const ids = [...new Set(tagIds)];
    const find = database.prepare('SELECT id FROM tags WHERE id = ?');
    for (const id of ids) if (!find.get(id)) throw new ValidationError('TAG_NOT_FOUND', '指定されたタグが見つかりません', {tagIds: '指定されたタグが見つかりません'});
    const insert = database.prepare('INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)');
    const findName = database.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
    for (const rawName of newTagNames) {
        const name = rawName.trim();
        if (!name) throw new ValidationError('TAG_NAME_REQUIRED', 'タグ名を入力してください', {newTagNames: 'タグ名を入力してください'});
        if ([...name].length > 30) throw new ValidationError('TAG_NAME_TOO_LONG', 'タグ名は30文字以内で入力してください', {newTagNames: 'タグ名は30文字以内で入力してください'});
        const existing = findName.get(name) as { id: string } | undefined;
        if (existing) ids.push(existing.id);
        else {
            const id = randomUUID();
            insert.run(id, name, now, now);
            ids.push(id);
        }
    }
    return [...new Set(ids)];
}

export function listLifeLogs(page = 1, tagId?: string): { items: LifeLog[]; totalItems: number; totalPages: number } {
    const database = getDatabase();
    const condition = tagId ? 'AND EXISTS (SELECT 1 FROM lifelog_tags filter_lt WHERE filter_lt.lifelog_id = l.id AND filter_lt.tag_id = @tagId)' : '';
    const params = tagId ? {tagId} : {};
    const total = database.prepare(`SELECT COUNT(*) as count FROM lifelogs l WHERE deleted_at IS NULL ${condition}`).get(params) as {
        count: number
    };
    const rows = database.prepare(`SELECT l.* FROM lifelogs l WHERE deleted_at IS NULL ${condition} ORDER BY occurred_at DESC, id DESC LIMIT 20 OFFSET @offset`).all({
        ...params,
        offset: (page - 1) * 20
    }) as Row[];
    return {
        items: rows.map((row) => toLifeLog(database, row)),
        totalItems: total.count,
        totalPages: Math.ceil(total.count / 20)
    };
}

export function listAllLifeLogs(): LifeLog[] {
    const database = getDatabase();
    const rows = database.prepare(`
        SELECT * FROM lifelogs
        WHERE deleted_at IS NULL
        ORDER BY occurred_at DESC, id DESC
    `).all() as Row[];
    return rows.map((row) => toLifeLog(database, row));
}

function isImportedLifeLog(value: unknown): value is Omit<LifeLog, 'deletedAt'> {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as Partial<Omit<LifeLog, 'deletedAt'>>;
    if (typeof item.id !== 'string' || item.id.length === 0 ||
        typeof item.body !== 'string' || item.body.trim().length === 0 || [...item.body].length > 1000 ||
        typeof item.occurredAt !== 'string' || Number.isNaN(Date.parse(item.occurredAt)) ||
        item.timezone !== 'Asia/Tokyo' ||
        typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt)) ||
        typeof item.updatedAt !== 'string' || Number.isNaN(Date.parse(item.updatedAt)) ||
        !Array.isArray(item.tags)) return false;
    if (item.tags.some((tag) => typeof tag !== 'object' || tag === null ||
        typeof (tag as Partial<Tag>).id !== 'string' || (tag as Partial<Tag>).id!.length === 0 ||
        typeof (tag as Partial<Tag>).name !== 'string' || (tag as Partial<Tag>).name!.trim().length === 0 ||
        [...(tag as Partial<Tag>).name!].length > 30 ||
        typeof (tag as Partial<Tag>).createdAt !== 'string' || Number.isNaN(Date.parse((tag as Partial<Tag>).createdAt!)) ||
        typeof (tag as Partial<Tag>).updatedAt !== 'string' || Number.isNaN(Date.parse((tag as Partial<Tag>).updatedAt!)))) return false;
    if (item.location !== null && item.location !== undefined) {
        const location = item.location;
        if (typeof location !== 'object' ||
            typeof location.latitude !== 'number' || !Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 ||
            typeof location.longitude !== 'number' || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180 ||
            (location.accuracyMeters !== null && (typeof location.accuracyMeters !== 'number' || !Number.isFinite(location.accuracyMeters) || location.accuracyMeters <= 0)) ||
            typeof location.capturedAt !== 'string' || Number.isNaN(Date.parse(location.capturedAt))) return false;
    }
    return true;
}

export function importLifeLogs(input: unknown): ImportLifeLogsResult {
    if (!Array.isArray(input)) throw new ValidationError('INVALID_IMPORT_FORMAT', 'JSONは記録の配列である必要があります');
    const database = getDatabase();
    const seenIds = new Set<string>();
    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    const findLifeLog = database.prepare('SELECT id FROM lifelogs WHERE id = ?');
    const findTagById = database.prepare('SELECT id FROM tags WHERE id = ?');
    const findTagByName = database.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
    const insertTag = database.prepare('INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)');
    const insertLifeLog = database.prepare(`INSERT INTO lifelogs (
        id, body, occurred_at, timezone, created_at, updated_at,
        latitude, longitude, location_accuracy_meters, location_captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertLink = database.prepare('INSERT INTO lifelog_tags (lifelog_id, tag_id) VALUES (?, ?)');

    for (const value of input) {
        if (!isImportedLifeLog(value)) {
            invalid++;
            continue;
        }
        if (seenIds.has(value.id) || findLifeLog.get(value.id)) {
            skipped++;
            continue;
        }
        seenIds.add(value.id);
        database.transaction(() => {
            const tagIds = value.tags.map((tag) => {
                const existingById = findTagById.get(tag.id) as { id: string } | undefined;
                if (existingById) return existingById.id;
                const existingByName = findTagByName.get(tag.name.trim()) as { id: string } | undefined;
                if (existingByName) return existingByName.id;
                insertTag.run(tag.id, tag.name.trim(), tag.createdAt, tag.updatedAt);
                return tag.id;
            });
            const location = value.location;
            insertLifeLog.run(
                value.id, value.body, new Date(value.occurredAt).toISOString(), value.timezone,
                value.createdAt, value.updatedAt, location?.latitude ?? null, location?.longitude ?? null,
                location?.accuracyMeters ?? null, location?.capturedAt ?? null,
            );
            [...new Set(tagIds)].forEach((tagId) => insertLink.run(value.id, tagId));
        })();
        imported++;
    }
    return {imported, skipped, invalid};
}

export function getLifeLog(id: string, includeDeleted = false): LifeLog | undefined {
    const database = getDatabase();
    const row = getRow(database, id, includeDeleted);
    return row ? toLifeLog(database, row) : undefined;
}

export function createLifeLog(input: CreateLifeLogInput): LifeLog {
    assertValidInput(input);
    const database = getDatabase();
    const now = new Date().toISOString();
    const id = randomUUID();
    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const create = database.transaction(() => {
        const tagIds = resolveTags(database, input.tagIds, input.newTagNames, now);
        const location = input.location;
        database.prepare(`INSERT INTO lifelogs (
            id, body, occurred_at, timezone, created_at, updated_at,
            latitude, longitude, location_accuracy_meters, location_captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, input.body, occurredAt, 'Asia/Tokyo', now, now,
            location?.latitude ?? null, location?.longitude ?? null,
            location?.accuracyMeters ?? null, location?.capturedAt ?? null,
        );
        const link = database.prepare('INSERT INTO lifelog_tags (lifelog_id, tag_id) VALUES (?, ?)');
        tagIds.forEach((tagId) => link.run(id, tagId));
    });
    create();
    return getLifeLog(id)!;
}

export function updateLifeLog(id: string, input: UpdateLifeLogInput): LifeLog | undefined {
    assertValidInput(input, true);
    const database = getDatabase();
    if (!getRow(database, id)) return undefined;
    const current = getRow(database, id)!;
    const now = new Date().toISOString();
    database.transaction(() => {
        const occurredAt = input.occurredAt === undefined ? current.occurred_at : normalizeOccurredAt(input.occurredAt);
        const location = input.location;
        const locationSql = location === undefined ? '' : ', latitude = ?, longitude = ?, location_accuracy_meters = ?, location_captured_at = ?';
        const params: unknown[] = [input.body ?? current.body, occurredAt, now];
        if (location !== undefined) {
            params.push(location?.latitude ?? null, location?.longitude ?? null, location?.accuracyMeters ?? null, location?.capturedAt ?? null);
        }
        params.push(id);
        database.prepare(`UPDATE lifelogs SET body = ?, occurred_at = ?, updated_at = ?${locationSql} WHERE id = ?`).run(...params);
        if (input.tagIds !== undefined || input.newTagNames !== undefined) {
            const tagIds = resolveTags(database, input.tagIds ?? [], input.newTagNames ?? [], now);
            database.prepare('DELETE FROM lifelog_tags WHERE lifelog_id = ?').run(id);
            const link = database.prepare('INSERT INTO lifelog_tags (lifelog_id, tag_id) VALUES (?, ?)');
            tagIds.forEach((tagId) => link.run(id, tagId));
        }

    })();
    return getLifeLog(id);
}

export type MapLifeLog = {
    id: string;
    occurredAt: string;
    bodyPreview: string;
    tags: Tag[];
    location: Exclude<LifeLog['location'], null>;
};

export function listMapLifeLogs(options: { tagId?: string; from?: string; to?: string } = {}): {
    items: MapLifeLog[];
    truncated: boolean
} {
    const database = getDatabase();
    const filters = [
        options.tagId ? 'AND EXISTS (SELECT 1 FROM lifelog_tags filter_lt WHERE filter_lt.lifelog_id = l.id AND filter_lt.tag_id = @tagId)' : '',
        options.from ? 'AND l.occurred_at >= @from' : '',
        options.to ? 'AND l.occurred_at <= @to' : '',
    ].join(' ');
    const params: Record<string, string> = {};
    if (options.tagId) params.tagId = options.tagId;
    if (options.from) params.from = options.from;
    if (options.to) params.to = options.to;
    const rows = database.prepare(`
        SELECT l.* FROM lifelogs l
        WHERE l.deleted_at IS NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
          AND l.location_captured_at IS NOT NULL ${filters}
        ORDER BY l.occurred_at DESC, l.id DESC
        LIMIT 101
    `).all(params) as Row[];
    const truncated = rows.length > 100;
    return {
        truncated,
        items: rows.slice(0, 100).map((row) => {
            const item = toLifeLog(database, row);
            if (!item.location) throw new Error('位置情報付き記録の変換に失敗しました');
            return {
                id: item.id,
                occurredAt: item.occurredAt,
                bodyPreview: [...item.body].slice(0, 120).join(''),
                tags: item.tags,
                location: item.location
            };
        }),
    };
}

export function deleteLifeLog(id: string): boolean {
    const database = getDatabase();
    return database.prepare('UPDATE lifelogs SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(new Date().toISOString(), new Date().toISOString(), id).changes > 0;
}

export function listTrash(page = 1): { items: LifeLog[]; totalItems: number; totalPages: number } {
    const database = getDatabase();
    const total = database.prepare('SELECT COUNT(*) as count FROM lifelogs WHERE deleted_at IS NOT NULL').get() as {
        count: number
    };
    const rows = database.prepare('SELECT * FROM lifelogs WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC, id DESC LIMIT 20 OFFSET ?').all((page - 1) * 20) as Row[];
    return {
        items: rows.map((row) => toLifeLog(database, row)),
        totalItems: total.count,
        totalPages: Math.ceil(total.count / 20)
    };
}

export function restoreLifeLog(id: string): LifeLog | undefined {
    const database = getDatabase();
    const result = database.prepare('UPDATE lifelogs SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL').run(new Date().toISOString(), id);
    return result.changes ? getLifeLog(id) : undefined;
}

export function permanentlyDeleteLifeLog(id: string): boolean {
    return getDatabase().prepare('DELETE FROM lifelogs WHERE id = ? AND deleted_at IS NOT NULL').run(id).changes > 0;
}
