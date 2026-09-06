import {NextRequest, NextResponse} from 'next/server';
import {listMapLifeLogs} from '@/../lib/lifelog/repository';
import {errorResponse, parseDateRange, parseOptionalId} from '@/lib/api';

export function GET(request: NextRequest) {
    try {
        const tagId = parseOptionalId(request, 'tagId');
        const {from, to} = parseDateRange(request);
        const result = listMapLifeLogs({tagId, from, to});
        return NextResponse.json(result);
    } catch (error) {
        return errorResponse(error, '地図用ライフログの取得に失敗しました');
    }
}
