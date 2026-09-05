/** @jest-environment node */

import {POST} from '../../../../../../src/app/api/lifelogs/import/route';
import {importLifeLogs} from '../../../../../../lib/lifelog/repository';
import {ValidationError} from '../../../../../../src/domain/validation';

jest.mock('../../../../../../lib/lifelog/repository', () => ({
    importLifeLogs: jest.fn(),
}));

const mockedImportLifeLogs = jest.mocked(importLifeLogs);

describe('POST /api/lifelogs/import', () => {
    afterEach(() => jest.clearAllMocks());

    it('インポート結果を返す', async () => {
        mockedImportLifeLogs.mockReturnValue({imported: 2, skipped: 1, invalid: 1});

        const response = await POST(new Request('http://localhost/api/lifelogs/import', {
            method: 'POST',
            body: JSON.stringify([]),
            headers: {'Content-Type': 'application/json'},
        }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({imported: 2, skipped: 1, invalid: 1});
    });

    it('形式不正時に400を返す', async () => {
        mockedImportLifeLogs.mockImplementation(() => {
            throw new ValidationError('INVALID_IMPORT_FORMAT', 'JSONは記録の配列である必要があります');
        });

        const response = await POST(new Request('http://localhost/api/lifelogs/import', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {'Content-Type': 'application/json'},
        }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_IMPORT_FORMAT', message: 'JSONは記録の配列である必要があります'},
        });
    });

    it('JSON構文エラー時に400を返す', async () => {
        const response = await POST(new Request('http://localhost/api/lifelogs/import', {
            method: 'POST',
            body: '{',
            headers: {'Content-Type': 'application/json'},
        }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: {code: 'INVALID_JSON', message: 'JSONの形式が不正です'},
        });
    });
});
