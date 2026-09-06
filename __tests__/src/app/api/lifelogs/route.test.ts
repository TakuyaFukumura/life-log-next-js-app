/** @jest-environment node */

import {NextRequest} from 'next/server';
import {GET, POST} from '../../../../../src/app/api/lifelogs/route';
import {createLifeLog, listLifeLogs} from '../../../../../lib/lifelog/repository';
import {ValidationError} from '../../../../../src/domain/validation';

jest.mock('../../../../../lib/lifelog/repository', () => ({
    createLifeLog: jest.fn(),
    listLifeLogs: jest.fn(),
}));

const mockedCreateLifeLog = jest.mocked(createLifeLog);
const mockedListLifeLogs = jest.mocked(listLifeLogs);

describe('/api/lifelogs', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns paginated logs and passes page and tag filters', async () => {
        mockedListLifeLogs.mockReturnValue({items: [], totalItems: 0, totalPages: 0});

        const response = GET(new NextRequest('http://localhost/api/lifelogs?page=2&tagId=tag-1'));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            items: [],
            pagination: {page: 2, pageSize: 20, totalItems: 0, totalPages: 0},
        });
        expect(mockedListLifeLogs).toHaveBeenCalledWith(2, 'tag-1');
    });

    it('returns 400 for an invalid page', async () => {
        const response = GET(new NextRequest('http://localhost/api/lifelogs?page=0'));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_PAGE', message: 'ページ番号が不正です'},
        });
        expect(mockedListLifeLogs).not.toHaveBeenCalled();
    });

    it('creates a log from JSON and returns 201', async () => {
        const item = {
            id: 'log-1', body: '記録', occurredAt: '2026-09-05T00:00:00.000Z',
            timezone: 'Asia/Tokyo' as const, tags: [], createdAt: 'now', updatedAt: 'now',
            deletedAt: null, location: null,
        };
        mockedCreateLifeLog.mockReturnValue(item);

        const response = await POST(new Request('http://localhost/api/lifelogs', {
            method: 'POST',
            body: JSON.stringify({body: '記録'}),
            headers: {'Content-Type': 'application/json'},
        }));

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({item: {...item, deletedAt: undefined}});
        expect(mockedCreateLifeLog).toHaveBeenCalledWith({body: '記録'});
    });

    it('returns validation errors from create', async () => {
        mockedCreateLifeLog.mockImplementation(() => {
            throw new ValidationError('BODY_REQUIRED', '本文を入力してください');
        });

        const response = await POST(new Request('http://localhost/api/lifelogs', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {'Content-Type': 'application/json'},
        }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'BODY_REQUIRED', message: '本文を入力してください'},
        });
    });
});
