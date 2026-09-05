'use client';

import {FormEvent, useCallback, useEffect, useState} from 'react';
import type {ApiLifeLog} from '../domain/lifelog';
import type {LifeLogLocationInput} from '../domain/lifelog';
import LocationPicker from './components/LocationPicker';

type Pagination = {page: number; pageSize: number; totalItems: number; totalPages: number};
type FormState = {body: string; occurredAt: string; newTagNames: string; location: LifeLogLocationInput};

const localDateTime = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function Home() {
    const [items, setItems] = useState<ApiLifeLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({page: 1, pageSize: 20, totalItems: 0, totalPages: 0});
    const [form, setForm] = useState<FormState>({body: '', occurredAt: localDateTime(), newTagNames: '', location: null});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const fetchItems = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/lifelogs?page=${page}`);
            const data = await response.json() as {items?: ApiLifeLog[]; pagination?: Pagination; error?: {message: string}};
            if (!response.ok) throw new Error(`エラー: ${data.error?.message ?? '記録の取得に失敗しました'}`);
            setItems(data.items ?? []);
            if (data.pagination) setPagination(data.pagination);
            setError(null);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : '記録の取得に失敗しました');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        // 初回表示時に一覧を取得する。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchItems();
    }, [fetchItems]);

    const openCreate = () => {
        setEditingId(null);
        setForm({body: '', occurredAt: localDateTime(), newTagNames: '', location: null});
        setIsModalOpen(true);
    };

    const openEdit = (item: ApiLifeLog) => {
        setEditingId(item.id);
        setIsModalOpen(true);
        setForm({body: item.body, occurredAt: item.occurredAt.slice(0, 16), newTagNames: item.tags.map((tag) => tag.name).join(', '), location: item.location});
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const endpoint = editingId ? `/api/lifelogs/${editingId}` : '/api/lifelogs';
        const response = await fetch(endpoint, {
            method: editingId ? 'PATCH' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({body: form.body, occurredAt: new Date(form.occurredAt).toISOString(), newTagNames: form.newTagNames.split(',').map((name) => name.trim()).filter(Boolean), location: form.location}),
        });
        const data = await response.json() as {error?: {message: string}};
        if (!response.ok) { setError(data.error?.message ?? '保存に失敗しました'); return; }
        setNotice(editingId ? '記録を更新しました' : '記録を登録しました');
        setIsModalOpen(false);
        setEditingId(null);
        setForm({body: '', occurredAt: localDateTime(), newTagNames: '', location: null});
        await fetchItems(pagination.page);
    };

    const remove = async (id: string) => {
        if (!window.confirm('この記録をゴミ箱へ移動しますか？')) return;
        const response = await fetch(`/api/lifelogs/${id}`, {method: 'DELETE'});
        if (!response.ok) { setError('記録の削除に失敗しました'); return; }
        setNotice('記録をゴミ箱へ移動しました');
        await fetchItems(pagination.page);
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-8 dark:from-gray-900 dark:to-gray-800">
            <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">ライフログ</h1><p className="text-sm text-gray-500">日々の出来事を記録しましょう</p></div>
                    <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">記録する</button>
                </div>
                {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-green-700">{notice}</p>}
                {error && <div role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}<button type="button" className="ml-3 underline" onClick={() => void fetchItems(pagination.page)}>再試行</button></div>}
                {loading ? <p>読み込み中...</p> : items.length === 0 ? <div className="rounded border border-dashed p-8 text-center text-gray-500">記録はまだありません。「記録する」から始めましょう。</div> : <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border p-4 dark:border-gray-700"><time className="text-sm text-gray-500">{new Date(item.occurredAt).toLocaleString('ja-JP')}</time><p className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-100">{item.body}</p>{item.location && <p className="mt-2 text-sm text-green-700 dark:text-green-300">位置情報あり</p>}{item.tags.length > 0 && <p className="mt-2 text-sm text-blue-600">{item.tags.map((tag) => `#${tag.name}`).join(' ')}</p>}<div className="mt-3 flex gap-3 text-sm"><button type="button" className="text-blue-600 underline" onClick={() => openEdit(item)}>編集</button><button type="button" className="text-red-600 underline" onClick={() => void remove(item.id)}>削除</button></div></article>)}</div>}
                {pagination.totalPages > 1 && <nav aria-label="ページ送り" className="mt-6 flex justify-center gap-4"><button type="button" disabled={pagination.page <= 1} onClick={() => void fetchItems(pagination.page - 1)}>前へ</button><span>{pagination.page} / {pagination.totalPages}</span><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void fetchItems(pagination.page + 1)}>次へ</button></nav>}
            </section>
            {isModalOpen && <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"><form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-gray-800"><h2 className="mb-4 text-xl font-bold">{editingId ? '記録を編集' : '記録する'}</h2><label className="block">本文<textarea required maxLength={1000} value={form.body} onChange={(event) => setForm({...form, body: event.target.value})} className="mt-1 min-h-32 w-full rounded border p-2 text-black" /></label><label className="mt-4 block">日時<input required type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({...form, occurredAt: event.target.value})} className="mt-1 w-full rounded border p-2 text-black" /></label><label className="mt-4 block">タグ（カンマ区切り）<input value={form.newTagNames} onChange={(event) => setForm({...form, newTagNames: event.target.value})} className="mt-1 w-full rounded border p-2 text-black" /></label><LocationPicker location={form.location} onChange={(location) => setForm({...form, location})}/><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="rounded border px-4 py-2">キャンセル</button><button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">保存</button></div></form></div>}
        </main>
    );
}
