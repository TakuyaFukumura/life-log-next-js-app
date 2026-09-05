import {NextRequest, NextResponse} from 'next/server';
import {listMapLifeLogs} from '@/../lib/lifelog/repository';

export function GET(request: NextRequest) {
    try {
        const tagId = request.nextUrl.searchParams.get('tagId') ?? undefined;
        const result = listMapLifeLogs(tagId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('地図用ライフログの取得に失敗しました:', error);
        return NextResponse.json({error: {code: 'INTERNAL_ERROR', message: '地図用ライフログの取得に失敗しました'}}, {status: 500});
    }
}
