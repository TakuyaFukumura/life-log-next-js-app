import {NextResponse} from 'next/server';
import {restoreLifeLog} from '@/../lib/lifelog/repository';

export async function POST(_request: Request, context: {params: Promise<{id: string}>}) {
    const {id} = await context.params;
    const item = restoreLifeLog(id);
    if (!item) return NextResponse.json({error: {code: 'NOT_FOUND', message: 'ゴミ箱のライフログが見つかりません'}}, {status: 404});
    return NextResponse.json({item: {...item, deletedAt: undefined}});
}
