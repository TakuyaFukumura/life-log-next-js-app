import {assertValidInput, validateLifeLogInput, ValidationError} from '../../../src/domain/validation';

describe('位置情報の入力検証', () => {
    const location = {
        latitude: 35.681236,
        longitude: 139.767125,
        accuracyMeters: 12.5,
        capturedAt: '2026-09-05T06:00:00.000Z',
    };

    it('正常な位置情報を受け付ける', () => {
        expect(validateLifeLogInput({body: '本文', location})).toEqual({});
    });

    it('緯度・経度の範囲外を拒否する', () => {
        expect(validateLifeLogInput({
            body: '本文',
            location: {...location, latitude: 91}
        })).toEqual({location: '緯度の値が不正です'});
        expect(validateLifeLogInput({
            body: '本文',
            location: {...location, longitude: -181}
        })).toEqual({location: '経度の値が不正です'});
    });

    it('精度の0以下と不正な取得日時を拒否する', () => {
        expect(validateLifeLogInput({
            body: '本文',
            location: {...location, accuracyMeters: 0}
        })).toEqual({location: '位置情報の精度が不正です'});
        expect(validateLifeLogInput({
            body: '本文',
            location: {...location, capturedAt: 'invalid'}
        })).toEqual({location: '位置情報の取得日時が不正です'});
    });

    it('位置情報nullを受け付ける', () => {
        expect(() => assertValidInput({body: '本文', location: null})).not.toThrow();
    });

    it('不正な位置情報をValidationErrorとして通知する', () => {
        expect(() => assertValidInput({body: '本文', location: {...location, latitude: 91}})).toThrow(ValidationError);
    });
});
