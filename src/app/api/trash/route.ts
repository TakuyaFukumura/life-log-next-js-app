import {NextRequest, NextResponse} from 'next/server';
import {listTrash} from '@/../lib/lifelog/repository';
import {getDatabase} from '@/../lib/database';
import {errorResponse, parsePage} from '@/lib/api';

export function GET(request: NextRequest) {
    try {
        const page = parsePage(request);
        const result = listTrash(page);
        return NextResponse.json({
            items: result.items,
            pagination: {page, pageSize: 20, totalItems: result.totalItems, totalPages: result.totalPages}
        });
    } catch (error) {
        return errorResponse(error, 'ゴミ箱の処理に失敗しました');
    }
}

export function DELETE() {
    try {
        getDatabase().prepare('DELETE FROM lifelogs WHERE deleted_at IS NOT NULL').run();
        return new NextResponse(null, {status: 204});
    } catch (error) {
        return errorResponse(error, 'ゴミ箱の処理に失敗しました');
    }
}
