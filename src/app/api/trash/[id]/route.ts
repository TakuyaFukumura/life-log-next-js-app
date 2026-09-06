import {NextResponse} from 'next/server';
import {permanentlyDeleteLifeLog} from '@/../lib/lifelog/repository';
import {errorResponse, notFoundResponse, parseId} from '@/lib/api';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const id = parseId((await context.params).id);
        if (!permanentlyDeleteLifeLog(id)) return notFoundResponse('ゴミ箱のライフログが見つかりません');
        return new NextResponse(null, {status: 204});
    } catch (error) {
        return errorResponse(error, 'ゴミ箱の処理に失敗しました');
    }
}
