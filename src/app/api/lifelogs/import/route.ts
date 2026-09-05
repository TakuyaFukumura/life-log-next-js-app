import {NextResponse} from 'next/server';
import {importLifeLogs} from '@/../lib/lifelog/repository';
import {ValidationError} from '@/domain/validation';

export async function POST(request: Request) {
    try {
        let input: unknown;
        try {
            input = JSON.parse(await request.text());
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
