import {NextRequest, NextResponse} from 'next/server';
import {listTrash} from '@/../lib/lifelog/repository';
import {getDatabase} from '@/../lib/database';

export function GET(request: NextRequest) {
    const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
    if (!Number.isInteger(page) || page < 1) return NextResponse.json({
        error: {
            code: 'INVALID_PAGE',
            message: 'ページ番号が不正です'
        }
    }, {status: 400});
    const result = listTrash(page);
    return NextResponse.json({
        items: result.items,
        pagination: {page, pageSize: 20, totalItems: result.totalItems, totalPages: result.totalPages}
    });
}

export function DELETE() {
    const database = getDatabase();
    database.prepare('DELETE FROM lifelogs WHERE deleted_at IS NOT NULL').run();
    return new NextResponse(null, {status: 204});
}
