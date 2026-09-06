import {NextResponse} from 'next/server';
import {deleteLifeLog, getLifeLog, updateLifeLog} from '@/../lib/lifelog/repository';
import {errorResponse, notFoundResponse, parseId, parseJsonBody} from '@/lib/api';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const id = parseId((await context.params).id);
        const item = getLifeLog(id);
        if (!item) return notFoundResponse('ライフログが見つかりません');
        return NextResponse.json({item: {...item, deletedAt: undefined}});
    } catch (error) {
        return errorResponse(error, 'ライフログの処理に失敗しました');
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const id = parseId((await context.params).id);
        const item = updateLifeLog(id, await parseJsonBody(request));
        if (!item) return notFoundResponse('ライフログが見つかりません');
        return NextResponse.json({item: {...item, deletedAt: undefined}});
    } catch (error) {
        return errorResponse(error, 'ライフログの処理に失敗しました');
    }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const id = parseId((await context.params).id);
        if (!deleteLifeLog(id)) return notFoundResponse('ライフログが見つかりません');
        return new NextResponse(null, {status: 204});
    } catch (error) {
        return errorResponse(error, 'ライフログの処理に失敗しました');
    }
}
