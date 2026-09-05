/** @jest-environment node */

import {GET} from '../../../../../../src/app/api/lifelogs/export/route';
import {listAllLifeLogs} from '../../../../../../lib/lifelog/repository';

jest.mock('../../../../../../lib/lifelog/repository', () => ({
    listAllLifeLogs: jest.fn(),
}));

const mockedListAllLifeLogs = jest.mocked(listAllLifeLogs);

describe('GET /api/lifelogs/export', () => {
    afterEach(() => jest.clearAllMocks());

    it('削除日時を除いた全記録をJSON配列で返す', async () => {
        mockedListAllLifeLogs.mockReturnValue([{
            id: '1',
            body: 'テスト記録',
            occurredAt: '2026-09-05T06:00:00.000Z',
            timezone: 'Asia/Tokyo',
            tags: [],
            createdAt: '2026-09-05T06:00:00.000Z',
            updatedAt: '2026-09-05T06:00:00.000Z',
            deletedAt: null,
            location: null,
        }]);

        const response = GET();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="lifelogs-\d{4}-\d{2}-\d{2}\.json"$/);
        expect(await response.json()).toEqual([{
            id: '1',
            body: 'テスト記録',
            occurredAt: '2026-09-05T06:00:00.000Z',
            timezone: 'Asia/Tokyo',
            tags: [],
            createdAt: '2026-09-05T06:00:00.000Z',
            updatedAt: '2026-09-05T06:00:00.000Z',
            location: null,
        }]);
    });

    it('取得エラー時に500を返す', async () => {
        mockedListAllLifeLogs.mockImplementation(() => {
            throw new Error('database failure');
        });

        const response = GET();

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'ライフログのエクスポートに失敗しました',
            },
        });
    });
});
