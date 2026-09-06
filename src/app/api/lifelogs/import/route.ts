import {NextResponse} from 'next/server';
import {importLifeLogs} from '@/../lib/lifelog/repository';
import {ValidationError} from '@/domain/validation';
import {MAX_IMPORT_BYTES, MAX_IMPORT_RECORDS} from '@/domain/import-limits';

export async function POST(request: Request) {
    try {
        const contentLength = request.headers.get('content-length');
        if (contentLength !== null && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_IMPORT_BYTES) {
            return NextResponse.json({
                error: {code: 'IMPORT_TOO_LARGE', message: 'インポートできるJSONは5MB以内です'}
            }, {status: 413});
        }

        let input: unknown;
        try {
            const text = await request.text();
            if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
                return NextResponse.json({
                    error: {code: 'IMPORT_TOO_LARGE', message: 'インポートできるJSONは5MB以内です'}
                }, {status: 413});
            }
            input = JSON.parse(text);
            if (Array.isArray(input) && input.length > MAX_IMPORT_RECORDS) {
                return NextResponse.json({
                    error: {code: 'IMPORT_TOO_MANY_RECORDS', message: '一度にインポートできる記録は1,000件以内です'}
                }, {status: 413});
            }
        } catch {
            return NextResponse.json({
                error: {code: 'INVALID_JSON', message: 'JSONの形式が不正です'}
            }, {status: 400});
        }
        const result = importLifeLogs(input);
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({error: {code: error.code, message: error.message}}, {status: 400});
        }
        console.error('ライフログのインポートに失敗しました:', error);
        return NextResponse.json({
            error: {code: 'INTERNAL_ERROR', message: 'ライフログのインポートに失敗しました'}
        }, {status: 500});
    }
}
