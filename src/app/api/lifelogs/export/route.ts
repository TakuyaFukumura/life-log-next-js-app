import {NextResponse} from 'next/server';
import {listAllLifeLogs} from '@/../lib/lifelog/repository';
import {errorResponse} from '@/lib/api';

export function GET() {
    try {
        const items = listAllLifeLogs().map(({
            id, body, occurredAt, timezone, tags, createdAt, updatedAt, location
        }) => ({id, body, occurredAt, timezone, tags, createdAt, updatedAt, location}));
        const date = new Date().toISOString().slice(0, 10);
        return NextResponse.json(items, {
            headers: {
                'Content-Disposition': `attachment; filename="lifelogs-${date}.json"`,
            },
        });
    } catch (error) {
        return errorResponse(error, 'ライフログのエクスポートに失敗しました');
    }
}
