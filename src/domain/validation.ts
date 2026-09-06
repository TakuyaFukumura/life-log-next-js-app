import type {ApiLifeLog, CreateLifeLogInput, LifeLogLocationInput, Tag, UpdateLifeLogInput} from './lifelog';

export type ValidationResult = {
    body?: string;
    occurredAt?: string;
    tagIds?: string;
    newTagNames?: string;
    location?: string;
};

export function validateTagId(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length === 0) return 'タグIDの形式が不正です';
    return undefined;
}

export function normalizeTagName(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError('TAG_NAME_REQUIRED', 'タグ名を入力してください', {newTagNames: 'タグ名を入力してください'});
    }
    const name = value.trim();
    if ([...name].length > 30) {
        throw new ValidationError('TAG_NAME_TOO_LONG', 'タグ名は30文字以内で入力してください', {newTagNames: 'タグ名は30文字以内で入力してください'});
    }
    return name;
}

export function validateBody(body: unknown): string | undefined {
    if (typeof body !== 'string' || body.trim().length === 0) return '本文を入力してください';
    if ([...body].length > 1000) return '本文は1,000文字以内で入力してください';
    return undefined;
}

export function normalizeOccurredAt(value: unknown): string {
    if (value === undefined || value === '') return new Date().toISOString();
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new ValidationError('INVALID_OCCURRED_AT', '日時の形式が不正です', {occurredAt: '有効な日時を入力してください'});
    }
    return new Date(value).toISOString();
}

export function validateLocation(location: unknown): string | undefined {
    if (location === null) return undefined;
    if (typeof location !== 'object' || location === null) return '位置情報の形式が不正です';
    const value = location as Partial<Exclude<LifeLogLocationInput, null>>;
    if (typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90) {
        return '緯度の値が不正です';
    }
    if (typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
        return '経度の値が不正です';
    }
    if (value.accuracyMeters !== undefined && value.accuracyMeters !== null &&
        (typeof value.accuracyMeters !== 'number' || !Number.isFinite(value.accuracyMeters) || value.accuracyMeters <= 0)) {
        return '位置情報の精度が不正です';
    }
    if (typeof value.capturedAt !== 'string' || Number.isNaN(Date.parse(value.capturedAt))) {
        return '位置情報の取得日時が不正です';
    }
    return undefined;
}

export function validateLifeLogInput(input: CreateLifeLogInput | UpdateLifeLogInput, partial = false): ValidationResult {
    const errors: ValidationResult = {};
    if (!partial || 'body' in input) errors.body = validateBody(input.body);
    if ('occurredAt' in input && input.occurredAt !== undefined) {
        try {
            normalizeOccurredAt(input.occurredAt);
        } catch (error) {
            if (error instanceof ValidationError) errors.occurredAt = error.message;
            else throw error;
        }
    }
    if (input.tagIds !== undefined && (!Array.isArray(input.tagIds) || input.tagIds.some((id) => validateTagId(id)))) {
        errors.tagIds = 'タグIDの形式が不正です';
    }
    if (input.newTagNames !== undefined && (!Array.isArray(input.newTagNames) || input.newTagNames.some((name) => typeof name !== 'string'))) {
        errors.newTagNames = 'タグ名の形式が不正です';
    }
    if (input.newTagNames !== undefined && Array.isArray(input.newTagNames)) {
        for (const name of input.newTagNames) {
            if (typeof name !== 'string') continue;
            try {
                normalizeTagName(name);
            } catch (error) {
                if (error instanceof ValidationError) {
                    errors.newTagNames = error.message;
                    break;
                }
                throw error;
            }
        }
    }
    if ('location' in input && input.location !== undefined) errors.location = validateLocation(input.location);
    return Object.fromEntries(Object.entries(errors).filter(([, value]) => value !== undefined));
}

function normalizeRequiredDate(value: unknown): string | undefined {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return undefined;
    return new Date(value).toISOString();
}

export function normalizeImportedLifeLog(value: unknown): ApiLifeLog | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const item = value as Partial<ApiLifeLog>;
    if (validateTagId(item.id)) return undefined;
    if (validateBody(item.body)) return undefined;
    if (item.timezone !== 'Asia/Tokyo') return undefined;
    const occurredAt = normalizeRequiredDate(item.occurredAt);
    const createdAt = normalizeRequiredDate(item.createdAt);
    const updatedAt = normalizeRequiredDate(item.updatedAt);
    if (!occurredAt || !createdAt || !updatedAt || !Array.isArray(item.tags)) return undefined;

    const tags: Tag[] = [];
    for (const tag of item.tags) {
        if (typeof tag !== 'object' || tag === null) return undefined;
        const candidate = tag as Partial<Tag>;
        if (validateTagId(candidate.id)) return undefined;
        const createdTagAt = normalizeRequiredDate(candidate.createdAt);
        const updatedTagAt = normalizeRequiredDate(candidate.updatedAt);
        if (!createdTagAt || !updatedTagAt) return undefined;
        let name: string;
        try {
            name = normalizeTagName(candidate.name);
        } catch (error) {
            if (error instanceof ValidationError) return undefined;
            throw error;
        }
        tags.push({id: candidate.id!, name, createdAt: createdTagAt, updatedAt: updatedTagAt});
    }

    const location = item.location ?? null;
    if (validateLocation(location)) return undefined;
    const normalizedLocation = location === null ? null : {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters ?? null,
        capturedAt: new Date(location.capturedAt).toISOString(),
    };
    return {
        id: item.id!,
        body: item.body!,
        occurredAt,
        timezone: 'Asia/Tokyo',
        tags,
        createdAt,
        updatedAt,
        location: normalizedLocation,
    };
}

export class ValidationError extends Error {
    constructor(public code: string, message: string, public fields?: ValidationResult) {
        super(message);
        this.name = 'ValidationError';
    }
}

export function assertValidInput(input: CreateLifeLogInput | UpdateLifeLogInput, partial = false): void {
    const fields = validateLifeLogInput(input, partial);
    if (Object.keys(fields).length > 0) throw new ValidationError(
        fields.body ? 'BODY_REQUIRED' : 'VALIDATION_ERROR',
        Object.values(fields)[0]!,
        fields,
    );
}
