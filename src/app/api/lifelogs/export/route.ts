import {NextResponse} from 'next/server';
import {listAllLifeLogs} from '@/../lib/lifelog/repository';

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
        console.error('ライフログのエクスポートに失敗しました:', error);
        return NextResponse.json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'ライフログのエクスポートに失敗しました'
            }
        }, {status: 500});
    }
}
