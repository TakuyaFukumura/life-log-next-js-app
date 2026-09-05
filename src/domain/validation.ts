import type {CreateLifeLogInput, UpdateLifeLogInput} from './lifelog';

export type ValidationResult = {
    body?: string;
    occurredAt?: string;
    tagIds?: string;
    newTagNames?: string;
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
