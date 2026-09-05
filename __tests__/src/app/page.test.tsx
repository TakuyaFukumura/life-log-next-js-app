import {fireEvent, render, screen} from '@testing-library/react';
import Home from '../../../src/app/page';

const response = (body: unknown, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
} as Response);

const list = {items: [], pagination: {page: 1, pageSize: 20, totalItems: 0, totalPages: 0}};

describe('Home', () => {
    afterEach(() => jest.restoreAllMocks());

    it('空状態と記録モーダルを表示する', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(response(list));
        render(<Home/>, {reactStrictMode: false});
        expect(await screen.findByText(/記録はまだありません/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: '記録する'}));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('本文')).toHaveClass('dark:text-gray-100');
        expect(screen.getByLabelText('日時')).toHaveClass('dark:text-gray-100', 'dark:[color-scheme:dark]');
        expect(screen.getByLabelText('タグ（カンマ区切り）')).toHaveClass('dark:text-gray-100');
    });

    it('一覧を表示して削除確認を行う', async () => {
        const item = {id: '1', body: 'テスト記録', occurredAt: '2026-09-05T06:00:00.000Z', timezone: 'Asia/Tokyo', tags: [], createdAt: '2026-09-05T06:00:00.000Z', updatedAt: '2026-09-05T06:00:00.000Z'};
        jest.spyOn(global, 'fetch').mockResolvedValue(response({items: [item], pagination: {...list.pagination, totalItems: 1}}));
        jest.spyOn(window, 'confirm').mockReturnValue(false);
        render(<Home/>, {reactStrictMode: false});
        expect(await screen.findByText('テスト記録')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: '削除'}));
        expect(window.confirm).toHaveBeenCalled();
    });
});
