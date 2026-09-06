/** @jest-environment node */

import {NextRequest} from 'next/server';
import {GET} from '../../../../../../src/app/api/lifelogs/map/route';
import {listMapLifeLogs} from '../../../../../../lib/lifelog/repository';

jest.mock('../../../../../../lib/lifelog/repository', () => ({
    listMapLifeLogs: jest.fn(),
}));

const mockedListMapLifeLogs = jest.mocked(listMapLifeLogs);

describe('GET /api/lifelogs/map', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns map logs with tag and date filters', async () => {
        mockedListMapLifeLogs.mockReturnValue({items: [], truncated: false});

        const response = GET(new NextRequest('http://localhost/api/lifelogs/map?tagId=tag-1&from=2026-09-01&to=2026-09-30'));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({items: [], truncated: false});
        expect(mockedListMapLifeLogs).toHaveBeenCalledWith({
            tagId: 'tag-1', from: '2026-09-01', to: '2026-09-30',
        });
    });

    it('returns 400 when the date range is reversed', async () => {
        const response = GET(new NextRequest('http://localhost/api/lifelogs/map?from=2026-09-30&to=2026-09-01'));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_DATE_RANGE', message: '開始日時は終了日時以前にしてください'},
        });
        expect(mockedListMapLifeLogs).not.toHaveBeenCalled();
    });

    it('returns 500 for repository failures', async () => {
        mockedListMapLifeLogs.mockImplementation(() => {
            throw new Error('database failure');
        });

        const response = GET(new NextRequest('http://localhost/api/lifelogs/map'));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: {code: 'INTERNAL_ERROR', message: '地図用ライフログの取得に失敗しました'},
        });
    });
});
