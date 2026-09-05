import {NextRequest, NextResponse} from 'next/server';
import {createLifeLog, listLifeLogs} from '@/../lib/lifelog/repository';
import {ValidationError} from '@/domain/validation';

function errorResponse(error: unknown) {
    if (error instanceof ValidationError) {
        return NextResponse.json({error: {code: error.code, message: error.message, fields: error.fields}}, {status: 400});
    }
    console.error('ライフログの処理に失敗しました:', error);
    return NextResponse.json({error: {code: 'INTERNAL_ERROR', message: 'ライフログの処理に失敗しました'}}, {status: 500});
}

export function GET(request: NextRequest) {
    const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const tagId = request.nextUrl.searchParams.get('tagId') ?? undefined;
    if (!Number.isInteger(page) || page < 1) return NextResponse.json({error: {code: 'INVALID_PAGE', message: 'ページ番号が不正です'}}, {status: 400});
    try {
        const result = listLifeLogs(page, tagId);
        return NextResponse.json({items: result.items.map((item) => ({id: item.id, body: item.body, occurredAt: item.occurredAt, timezone: item.timezone, tags: item.tags, createdAt: item.createdAt, updatedAt: item.updatedAt})), pagination: {page, pageSize: 20, totalItems: result.totalItems, totalPages: result.totalPages}});
    } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
    try {
        const item = createLifeLog(await request.json());
        return NextResponse.json({item: {...item, deletedAt: undefined}}, {status: 201});
    } catch (error) { return errorResponse(error); }
}
