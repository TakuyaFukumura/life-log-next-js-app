import {NextResponse} from 'next/server';
import {permanentlyDeleteLifeLog} from '@/../lib/lifelog/repository';

export async function DELETE(_request: Request, context: {params: Promise<{id: string}>}) {
    const {id} = await context.params;
    if (!permanentlyDeleteLifeLog(id)) return NextResponse.json({error: {code: 'NOT_FOUND', message: 'ゴミ箱のライフログが見つかりません'}}, {status: 404});
    return new NextResponse(null, {status: 204});
}
