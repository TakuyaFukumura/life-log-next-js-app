'use client';

import dynamic from 'next/dynamic';

const LifeLogMap = dynamic(() => import('./LifeLogMap'), {
    ssr: false,
    loading: () => <p className="p-4">地図を読み込んでいます...</p>,
});

export default function MapClient() {
    return <LifeLogMap/>;
}
