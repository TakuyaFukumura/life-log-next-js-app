/** @jest-environment node */

import {POST} from '../../../../../../../src/app/api/trash/[id]/restore/route';
import {restoreLifeLog} from '../../../../../../../lib/lifelog/repository';

jest.mock('../../../../../../../lib/lifelog/repository', () => ({
    restoreLifeLog: jest.fn(),
}));

const mockedRestoreLifeLog = jest.mocked(restoreLifeLog);
const context = (id: string) => ({params: Promise.resolve({id})});

describe('POST /api/trash/[id]/restore', () => {
    afterEach(() => jest.clearAllMocks());

    it('restores a trash item', async () => {
        mockedRestoreLifeLog.mockReturnValue({
            id: 'log-1', body: '復元', occurredAt: '2026-09-05T00:00:00.000Z',
            timezone: 'Asia/Tokyo', tags: [], createdAt: 'now', updatedAt: 'now',
            deletedAt: null, location: null,
        });

        const response = await POST(new Request('http://localhost/api/trash/log-1/restore'), context('log-1'));

        expect(response.status).toBe(200);
        expect((await response.json()).item).not.toHaveProperty('deletedAt');
    });

    it('returns 404 when the item cannot be restored', async () => {
        mockedRestoreLifeLog.mockReturnValue(undefined);

        const response = await POST(new Request('http://localhost/api/trash/log-1/restore'), context('log-1'));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: {code: 'NOT_FOUND', message: 'ゴミ箱のライフログが見つかりません'},
        });
    });
});
