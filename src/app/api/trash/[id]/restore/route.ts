import {NextResponse} from 'next/server';
import {restoreLifeLog} from '@/../lib/lifelog/repository';
import {errorResponse, notFoundResponse, parseId} from '@/lib/api';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const id = parseId((await context.params).id);
        const item = restoreLifeLog(id);
        if (!item) return notFoundResponse('ゴミ箱のライフログが見つかりません');
        return NextResponse.json({item: {...item, deletedAt: undefined}});
    } catch (error) {
        return errorResponse(error, 'ゴミ箱の処理に失敗しました');
    }
}
