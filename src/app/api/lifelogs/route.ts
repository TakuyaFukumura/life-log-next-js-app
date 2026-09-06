import {NextRequest, NextResponse} from 'next/server';
import {createLifeLog, listLifeLogs} from '@/../lib/lifelog/repository';
import {errorResponse, parseJsonBody, parseOptionalId, parsePage} from '@/lib/api';

export function GET(request: NextRequest) {
    try {
        const page = parsePage(request);
        const tagId = parseOptionalId(request, 'tagId');
        const result = listLifeLogs(page, tagId);
        return NextResponse.json({
            items: result.items.map((item) => ({
                id: item.id,
                body: item.body,
                occurredAt: item.occurredAt,
                timezone: item.timezone,
                tags: item.tags,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                location: item.location
            })), pagination: {page, pageSize: 20, totalItems: result.totalItems, totalPages: result.totalPages}
        });
    } catch (error) {
        return errorResponse(error, 'ライフログの処理に失敗しました');
    }
}

export async function POST(request: Request) {
    try {
        const item = createLifeLog(await parseJsonBody(request));
        return NextResponse.json({item: {...item, deletedAt: undefined}}, {status: 201});
    } catch (error) {
        return errorResponse(error, 'ライフログの処理に失敗しました');
    }
}
