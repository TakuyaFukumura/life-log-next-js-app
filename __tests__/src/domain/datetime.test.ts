import {formatJapanLocalDateTime, japanLocalDateTimeToIso} from '../../../src/domain/datetime';

describe('日本時間の日時処理', () => {
    it('ブラウザのタイムゾーンに依存せず日本時間の入力値を作る', () => {
        expect(formatJapanLocalDateTime(new Date('2026-09-05T15:04:00.000Z'))).toBe('2026-09-06T00:04');
    });

    it('日本時間の入力値を正しいUTC時刻へ変換する', () => {
        expect(japanLocalDateTimeToIso('2026-09-06T00:04')).toBe('2026-09-05T15:04:00.000Z');
    });

    it('入力値の形式が不正なら拒否する', () => {
        expect(() => japanLocalDateTimeToIso('2026/09/06 00:04')).toThrow('日時の形式が不正です');
    });
});
