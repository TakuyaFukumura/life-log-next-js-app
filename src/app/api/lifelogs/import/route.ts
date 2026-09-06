import {NextResponse} from 'next/server';
import {importLifeLogs} from '@/../lib/lifelog/repository';
import {MAX_IMPORT_BYTES, MAX_IMPORT_RECORDS} from '@/domain/import-limits';
import {errorResponse, parseJsonBody} from '@/lib/api';

export async function POST(request: Request) {
    try {
        const input = await parseJsonBody(request, {
            maxBytes: MAX_IMPORT_BYTES,
            tooLargeCode: 'IMPORT_TOO_LARGE',
            tooLargeMessage: 'インポートできるJSONは5MB以内です',
        });
        if (Array.isArray(input) && input.length > MAX_IMPORT_RECORDS) {
            return NextResponse.json({
                error: {code: 'IMPORT_TOO_MANY_RECORDS', message: '一度にインポートできる記録は1,000件以内です'}
            }, {status: 413});
        }
        const result = importLifeLogs(input);
        return NextResponse.json(result);
    } catch (error) {
        return errorResponse(error, 'ライフログのインポートに失敗しました');
    }
}
