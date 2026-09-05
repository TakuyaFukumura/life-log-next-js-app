import {NextResponse} from 'next/server';
import {deleteLifeLog, getLifeLog, updateLifeLog} from '@/../lib/lifelog/repository';
import {ValidationError} from '@/domain/validation';

function errorResponse(error: unknown) {
    if (error instanceof ValidationError) return NextResponse.json({
        error: {
            code: error.code,
            message: error.message,
            fields: error.fields
        }
    }, {status: 400});
    console.error('ライフログの処理に失敗しました:', error);
    return NextResponse.json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'ライフログの処理に失敗しました'
        }
    }, {status: 500});
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const {id} = await context.params;
    const item = getLifeLog(id);
    if (!item) return NextResponse.json({
        error: {
            code: 'NOT_FOUND',
            message: 'ライフログが見つかりません'
        }
    }, {status: 404});
    return NextResponse.json({item: {...item, deletedAt: undefined}});
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const {id} = await context.params;
        const item = updateLifeLog(id, await request.json());
        if (!item) return NextResponse.json({
            error: {
                code: 'NOT_FOUND',
                message: 'ライフログが見つかりません'
            }
        }, {status: 404});
        return NextResponse.json({item: {...item, deletedAt: undefined}});
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    const {id} = await context.params;
    if (!deleteLifeLog(id)) return NextResponse.json({
        error: {
            code: 'NOT_FOUND',
            message: 'ライフログが見つかりません'
        }
    }, {status: 404});
    return new NextResponse(null, {status: 204});
}
