/** @jest-environment node */

import {DELETE} from '../../../../../../src/app/api/trash/[id]/route';
import {permanentlyDeleteLifeLog} from '../../../../../../lib/lifelog/repository';

jest.mock('../../../../../../lib/lifelog/repository', () => ({
    permanentlyDeleteLifeLog: jest.fn(),
}));

const mockedPermanentlyDeleteLifeLog = jest.mocked(permanentlyDeleteLifeLog);
const context = (id: string) => ({params: Promise.resolve({id})});

describe('DELETE /api/trash/[id]', () => {
    afterEach(() => jest.clearAllMocks());

    it('permanently deletes a trash item', async () => {
        mockedPermanentlyDeleteLifeLog.mockReturnValue(true);

        const response = await DELETE(new Request('http://localhost/api/trash/log-1'), context('log-1'));

        expect(response.status).toBe(204);
        expect(mockedPermanentlyDeleteLifeLog).toHaveBeenCalledWith('log-1');
    });

    it('returns 404 when the item is not in trash', async () => {
        mockedPermanentlyDeleteLifeLog.mockReturnValue(false);

        const response = await DELETE(new Request('http://localhost/api/trash/log-1'), context('log-1'));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: {code: 'NOT_FOUND', message: 'ゴミ箱のライフログが見つかりません'},
        });
    });
});
