'use client';

import {useCallback, useEffect, useState} from 'react';
import type {LifeLog} from '../../domain/lifelog';

type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number };

export default function TrashPage() {
    const [items, setItems] = useState<LifeLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({page: 1, pageSize: 20, totalItems: 0, totalPages: 0});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const fetchItems = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/trash?page=${page}`);
            const data = await response.json() as {
                items?: LifeLog[];
                pagination?: Pagination;
                error?: { message: string };
            };
            if (!response.ok) throw new Error(data.error?.message ?? 'ゴミ箱の取得に失敗しました');
            setItems(data.items ?? []);
            if (data.pagination) setPagination(data.pagination);
            setError(null);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'ゴミ箱の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // 初回表示時にゴミ箱の一覧を取得する。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchItems();
    }, [fetchItems]);

    const restore = async (id: string) => {
        const response = await fetch(`/api/trash/${id}/restore`, {method: 'POST'});
        if (!response.ok) {
            setError('記録の復元に失敗しました');
            return;
        }
        setNotice('記録を復元しました');
        await fetchItems(pagination.page);
    };

    const permanentlyDelete = async (id: string) => {
        if (!window.confirm('この記録を完全に削除しますか？復元できなくなります。')) return;
        const response = await fetch(`/api/trash/${id}`, {method: 'DELETE'});
        if (!response.ok) {
            setError('記録の完全削除に失敗しました');
            return;
        }
        setNotice('記録を完全に削除しました');
        await fetchItems(pagination.page);
    };

    const emptyTrash = async () => {
        if (!window.confirm('ゴミ箱内の記録をすべて完全に削除しますか？復元できなくなります。')) return;
        const response = await fetch('/api/trash', {method: 'DELETE'});
        if (!response.ok) {
            setError('ゴミ箱を空にできませんでした');
            return;
        }
        setNotice('ゴミ箱を空にしました');
        await fetchItems(1);
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-8 dark:from-gray-900 dark:to-gray-800">
            <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">ゴミ箱</h1>
                        <p className="text-sm text-gray-500">削除した記録はここから復元または完全削除できます。</p>
                    </div>
                    <button type="button" disabled={pagination.totalItems === 0} onClick={() => void emptyTrash()}
                            className="rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                        ゴミ箱を空にする
                    </button>
                </div>
                {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-green-700">{notice}</p>}
                {error && <div role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}
                    <button type="button" className="ml-3 underline" onClick={() => void fetchItems(pagination.page)}>再試行</button>
                </div>}
                {loading ? <p>読み込み中...</p> : items.length === 0 ? <div className="rounded border border-dashed p-8 text-center text-gray-500">ゴミ箱は空です。</div> :
                    <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border p-4 dark:border-gray-700">
                        <time className="text-sm text-gray-500">{new Date(item.occurredAt).toLocaleString('ja-JP')}</time>
                        <p className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-100">{item.body}</p>
                        <p className="mt-2 text-sm text-gray-500">削除日時: {item.deletedAt ? new Date(item.deletedAt).toLocaleString('ja-JP') : '不明'}</p>
                        <div className="mt-3 flex gap-3 text-sm">
                            <button type="button" className="text-blue-600 underline" onClick={() => void restore(item.id)}>復元</button>
                            <button type="button" className="text-red-600 underline" onClick={() => void permanentlyDelete(item.id)}>完全削除</button>
                        </div>
                    </article>)}</div>}
                {pagination.totalPages > 1 && <nav aria-label="ページ送り" className="mt-6 flex justify-center gap-4">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => void fetchItems(pagination.page - 1)}>前へ</button>
                    <span>{pagination.page} / {pagination.totalPages}</span>
                    <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void fetchItems(pagination.page + 1)}>次へ</button>
                </nav>}
            </section>
        </main>
    );
}
