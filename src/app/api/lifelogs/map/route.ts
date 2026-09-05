import {NextRequest, NextResponse} from 'next/server';
import {listMapLifeLogs} from '@/../lib/lifelog/repository';
import {ValidationError} from '@/domain/validation';

export function GET(request: NextRequest) {
    try {
        const tagId = request.nextUrl.searchParams.get('tagId') ?? undefined;
        const from = request.nextUrl.searchParams.get('from') ?? undefined;
        const to = request.nextUrl.searchParams.get('to') ?? undefined;
        if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to)))) {
            throw new ValidationError('INVALID_DATE_RANGE', '期間の形式が不正です');
        }
        if (from && to && Date.parse(from) > Date.parse(to)) {
            throw new ValidationError('INVALID_DATE_RANGE', '開始日時は終了日時以前にしてください');
        }
        const result = listMapLifeLogs({tagId, from, to});
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({error: {code: error.code, message: error.message}}, {status: 400});
        }
        console.error('地図用ライフログの取得に失敗しました:', error);
        return NextResponse.json({
            error: {
                code: 'INTERNAL_ERROR',
                message: '地図用ライフログの取得に失敗しました'
            }
        }, {status: 500});
    }
}
