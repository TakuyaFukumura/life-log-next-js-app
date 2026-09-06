import {NextResponse} from 'next/server';
import {getDatabase} from '@/../lib/database';
import {errorResponse} from '@/lib/api';

export function GET() {
    try {
        const rows = getDatabase().prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM tags ORDER BY name').all();
        return NextResponse.json({items: rows});
    } catch (error) {
        return errorResponse(error, 'タグの取得に失敗しました');
    }
}

export function POST() {
    return NextResponse.json({
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'タグ作成はライフログ登録時に行えます'
        }
    }, {status: 501});
}
