'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {MapContainer, Marker, Popup, TileLayer, useMap} from 'react-leaflet';
import {Icon} from 'leaflet';
import type {LatLngBoundsExpression} from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type {Tag} from '../../domain/lifelog';

const lifeLogMarkerIcon = new Icon({
    iconRetinaUrl: markerIcon2x.src,
    iconUrl: markerIcon.src,
    shadowUrl: markerShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type MapItem = {
    id: string;
    occurredAt: string;
    bodyPreview: string;
    tags: Tag[];
    location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
};

function FitToItems({items}: { items: MapItem[] }) {
    const map = useMap();
    useEffect(() => {
        if (items.length > 1) {
            const bounds: LatLngBoundsExpression = items.map((item) => [item.location.latitude, item.location.longitude]);
            map.fitBounds(bounds, {padding: [32, 32]});
        } else if (items.length === 1) {
            map.setView([items[0].location.latitude, items[0].location.longitude], 13);
        }
    }, [items, map]);
    return null;
}

export default function LifeLogMap() {
    const [items, setItems] = useState<MapItem[]>([]);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const center = useMemo<[number, number]>(() => items[0] ? [items[0].location.latitude, items[0].location.longitude] : [36.2048, 138.2529], [items]);

    useEffect(() => {
        let active = true;
        fetch('/api/lifelogs/map')
            .then(async (response) => {
                const data = await response.json() as {
                    items?: MapItem[];
                    truncated?: boolean;
                    error?: { message: string }
                };
                if (!response.ok) throw new Error(data.error?.message ?? '地図用記録の取得に失敗しました');
                if (active) {
                    setItems(data.items ?? []);
                    setTruncated(data.truncated ?? false);
                }
            })
            .catch((reason: unknown) => {
                if (active) setError(reason instanceof Error ? reason.message : '地図用記録の取得に失敗しました');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    if (loading) return <p className="p-4">地図を読み込んでいます...</p>;
    if (error) return <p role="alert" className="p-4 text-red-600">{error}</p>;

    return (
        <div className="relative h-[calc(100vh-4rem)]">
            <MapContainer center={center} zoom={items.length ? 13 : 5} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
                <FitToItems items={items}/>
                {items.map((item) => <Marker key={item.id} icon={lifeLogMarkerIcon}
                                             position={[item.location.latitude, item.location.longitude]}><Popup>
                    <div className="max-w-60">
                        <time
                            className="text-xs text-gray-500">{new Date(item.occurredAt).toLocaleString('ja-JP')}</time>
                        <p className="mt-1">{item.bodyPreview}</p>{item.tags.length > 0 &&
                        <p className="mt-1 text-xs text-blue-600">{item.tags.map((tag) => `#${tag.name}`).join(' ')}</p>}
                    </div>
                </Popup></Marker>)}
            </MapContainer>
            {items.length === 0 && <div
                className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-white/95 p-4 text-center shadow dark:bg-gray-800/95">
                <p>位置情報付きの記録はまだありません。</p><Link href="/logs"
                                                                className="mt-2 inline-block text-blue-600 underline">記録画面で位置情報を追加する</Link>
            </div>}
            {truncated &&
                <p className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white/95 px-3 py-2 text-sm shadow dark:bg-gray-800/95">表示できる記録は最大100件です。</p>}
        </div>
    );
}
