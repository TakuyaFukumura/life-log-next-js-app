import {NextResponse} from 'next/server';
import {ValidationError} from '@/domain/validation';

type JsonBodyOptions = {
    maxBytes?: number;
    tooLargeCode?: string;
    tooLargeMessage?: string;
};

export class ApiRequestError extends Error {
    constructor(
        public code: string,
        message: string,
        public status: number = 400,
        public fields?: Record<string, string>,
    ) {
        super(message);
        this.name = 'ApiRequestError';
    }
}

export function errorResponse(error: unknown, internalMessage: string) {
    if (error instanceof ValidationError || error instanceof ApiRequestError) {
        return NextResponse.json({
            error: {
                code: error.code,
                message: error.message,
                ...(error.fields ? {fields: error.fields} : {}),
            },
        }, {status: error instanceof ApiRequestError ? error.status : 400});
    }
    console.error(internalMessage, error);
    return NextResponse.json({
        error: {
            code: 'INTERNAL_ERROR',
            message: internalMessage,
        },
    }, {status: 500});
}

export function notFoundResponse(message: string) {
    return NextResponse.json({error: {code: 'NOT_FOUND', message}}, {status: 404});
}

export function parsePage(request: Request): number {
    const pageValue = new URL(request.url).searchParams.get('page') ?? '1';
    const page = Number(pageValue);
    if (!Number.isInteger(page) || page < 1) {
        throw new ApiRequestError('INVALID_PAGE', 'ページ番号が不正です');
    }
    return page;
}

export function parseId(id: string): string {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
        throw new ApiRequestError('INVALID_ID', 'IDの形式が不正です');
    }
    return id;
}

export function parseJsonBody<T = unknown>(request: Request, options: JsonBodyOptions = {}): Promise<T> {
    const {
        maxBytes = 1024 * 1024,
        tooLargeCode = 'BODY_TOO_LARGE',
        tooLargeMessage = 'リクエスト本文が大きすぎます',
    } = options;
    const contentType = request.headers.get('content-type');
    if (!contentType?.toLowerCase().startsWith('application/json')) {
        throw new ApiRequestError('INVALID_CONTENT_TYPE', 'Content-Typeはapplication/jsonである必要があります');
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength !== null) {
        const length = Number(contentLength);
        if (!Number.isFinite(length) || length < 0) {
            throw new ApiRequestError('INVALID_CONTENT_LENGTH', 'Content-Lengthの形式が不正です');
        }
        if (length > maxBytes) throw new ApiRequestError(tooLargeCode, tooLargeMessage, 413);
    }

    return request.text().then((text) => {
        if (new TextEncoder().encode(text).byteLength > maxBytes) {
            throw new ApiRequestError(tooLargeCode, tooLargeMessage, 413);
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new ApiRequestError('INVALID_JSON', 'JSONの形式が不正です');
        }
    });
}

export function parseDateRange(request: Request): { from?: string; to?: string } {
    const searchParams = new URL(request.url).searchParams;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to)))) {
        throw new ApiRequestError('INVALID_DATE_RANGE', '期間の形式が不正です');
    }
    if (from && to && Date.parse(from) > Date.parse(to)) {
        throw new ApiRequestError('INVALID_DATE_RANGE', '開始日時は終了日時以前にしてください');
    }
    return {from, to};
}

export function parseOptionalId(request: Request, name: string): string | undefined {
    const value = new URL(request.url).searchParams.get(name);
    return value === null ? undefined : parseId(value);
}
