/** @jest-environment node */

import {NextRequest} from 'next/server';
import {DELETE, GET} from '../../../../../src/app/api/trash/route';
import {getDatabase} from '../../../../../lib/database';
import {listTrash} from '../../../../../lib/lifelog/repository';

jest.mock('../../../../../lib/lifelog/repository', () => ({
    listTrash: jest.fn(),
}));
jest.mock('../../../../../lib/database', () => ({
    getDatabase: jest.fn(),
}));

const mockedListTrash = jest.mocked(listTrash);
const mockedGetDatabase = jest.mocked(getDatabase);

describe('/api/trash', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns a paginated trash list', async () => {
        mockedListTrash.mockReturnValue({items: [], totalItems: 0, totalPages: 0});

        const response = GET(new NextRequest('http://localhost/api/trash?page=2'));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            items: [],
            pagination: {page: 2, pageSize: 20, totalItems: 0, totalPages: 0},
        });
        expect(mockedListTrash).toHaveBeenCalledWith(2);
    });

    it('returns 400 for an invalid page', async () => {
        const response = GET(new NextRequest('http://localhost/api/trash?page=-1'));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_PAGE', message: 'ページ番号が不正です'},
        });
        expect(mockedListTrash).not.toHaveBeenCalled();
    });

    it('empties the trash', async () => {
        const run = jest.fn();
        mockedGetDatabase.mockReturnValue({prepare: jest.fn().mockReturnValue({run})} as never);

        const response = DELETE();

        expect(response.status).toBe(204);
        expect(run).toHaveBeenCalled();
    });
});
