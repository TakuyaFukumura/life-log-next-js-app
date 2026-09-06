/** @jest-environment node */

import {DELETE, GET, PATCH} from '../../../../../../src/app/api/lifelogs/[id]/route';
import {deleteLifeLog, getLifeLog, updateLifeLog} from '../../../../../../lib/lifelog/repository';

jest.mock('../../../../../../lib/lifelog/repository', () => ({
    deleteLifeLog: jest.fn(),
    getLifeLog: jest.fn(),
    updateLifeLog: jest.fn(),
}));

const mockedDeleteLifeLog = jest.mocked(deleteLifeLog);
const mockedGetLifeLog = jest.mocked(getLifeLog);
const mockedUpdateLifeLog = jest.mocked(updateLifeLog);

const context = (id: string) => ({params: Promise.resolve({id})});

describe('/api/lifelogs/[id]', () => {
    afterEach(() => jest.clearAllMocks());

    it('gets a log and hides deletedAt', async () => {
        mockedGetLifeLog.mockReturnValue({
            id: 'log-1', body: '記録', occurredAt: '2026-09-05T00:00:00.000Z',
            timezone: 'Asia/Tokyo', tags: [], createdAt: 'now', updatedAt: 'now',
            deletedAt: null, location: null,
        });

        const response = await GET(new Request('http://localhost/api/lifelogs/log-1'), context('log-1'));

        expect(response.status).toBe(200);
        expect((await response.json()).item).not.toHaveProperty('deletedAt');
    });

    it('updates a log', async () => {
        mockedUpdateLifeLog.mockReturnValue({
            id: 'log-1', body: '更新後', occurredAt: '2026-09-05T00:00:00.000Z',
            timezone: 'Asia/Tokyo', tags: [], createdAt: 'now', updatedAt: 'later',
            deletedAt: null, location: null,
        });

        const response = await PATCH(new Request('http://localhost/api/lifelogs/log-1', {
            method: 'PATCH',
            body: JSON.stringify({body: '更新後'}),
            headers: {'Content-Type': 'application/json'},
        }), context('log-1'));

        expect(response.status).toBe(200);
        expect(mockedUpdateLifeLog).toHaveBeenCalledWith('log-1', {body: '更新後'});
    });

    it('returns 404 when deleting an unknown log', async () => {
        mockedDeleteLifeLog.mockReturnValue(false);

        const response = await DELETE(new Request('http://localhost/api/lifelogs/missing'), context('missing'));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: {code: 'NOT_FOUND', message: 'ライフログが見つかりません'},
        });
    });

    it('returns 400 for an invalid id before accessing the repository', async () => {
        const response = await GET(new Request('http://localhost/api/lifelogs/bad%20id'), context('bad id'));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_ID', message: 'IDの形式が不正です'},
        });
        expect(mockedGetLifeLog).not.toHaveBeenCalled();
    });
});
