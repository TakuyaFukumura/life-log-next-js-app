'use client';

import {useState} from 'react';
import type {LifeLogLocationInput} from '../../domain/lifelog';

type Props = {
    location: LifeLogLocationInput;
    onChange: (location: LifeLogLocationInput) => void;
};

const errorMessage = (error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) return '位置情報の利用が拒否されました。ブラウザ設定を確認してください。';
    if (error.code === error.TIMEOUT) return '位置情報の取得がタイムアウトしました。再試行してください。';
    return 'この端末では位置情報を取得できません。';
};

export default function LocationPicker({location, onChange}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('この端末では位置情報を取得できません。');
            return;
        }
        setLoading(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onChange({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracyMeters: position.coords.accuracy > 0 ? position.coords.accuracy : null,
                    capturedAt: new Date(position.timestamp).toISOString(),
                });
                setLoading(false);
            },
            (reason) => {
                setError(errorMessage(reason));
                setLoading(false);
            },
            {enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000},
        );
    };

    return (
        <fieldset className="mt-4 rounded border p-3">
            <legend className="px-1">位置情報（任意）</legend>
            <p className="text-sm text-gray-600 dark:text-gray-300">現在地を記録に付ける場合だけ、ボタンを押してください。</p>
            {location &&
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">位置情報を取得済み（精度: {location.accuracyMeters === null || location.accuracyMeters === undefined ? '不明' : `${Math.round(location.accuracyMeters)}m`}）</p>}
            {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
            <div className="mt-2 flex gap-3">
                <button type="button" onClick={getCurrentLocation} disabled={loading}
                        className="rounded border px-3 py-1 text-sm disabled:opacity-50">
                    {loading ? '位置情報を取得しています...' : location ? '現在地を更新' : '現在地を追加'}
                </button>
                {location && <button type="button" onClick={() => onChange(null)}
                                     className="rounded border px-3 py-1 text-sm">位置情報を削除</button>}
            </div>
        </fieldset>
    );
}
