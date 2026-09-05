import type {CreateLifeLogInput, LifeLogLocationInput, UpdateLifeLogInput} from './lifelog';

export type ValidationResult = {
    body?: string;
    occurredAt?: string;
    tagIds?: string;
    newTagNames?: string;
    location?: string;
};

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

function validateLocation(location: unknown): string | undefined {
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
        try { normalizeOccurredAt(input.occurredAt); } catch (error) {
            if (error instanceof ValidationError) errors.occurredAt = error.message;
            else throw error;
        }
    }
    if (input.tagIds !== undefined && (!Array.isArray(input.tagIds) || input.tagIds.some((id) => typeof id !== 'string'))) {
        errors.tagIds = 'タグIDの形式が不正です';
    }
    if (input.newTagNames !== undefined && (!Array.isArray(input.newTagNames) || input.newTagNames.some((name) => typeof name !== 'string'))) {
        errors.newTagNames = 'タグ名の形式が不正です';
    }
    if ('location' in input && input.location !== undefined) errors.location = validateLocation(input.location);
    return Object.fromEntries(Object.entries(errors).filter(([, value]) => value !== undefined));
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
