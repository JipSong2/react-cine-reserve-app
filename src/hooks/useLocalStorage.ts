// src/hooks/useLocalStorage.ts
// 주요 기능: localStorage 읽기/쓰기를 React의 useState처럼 다룰 수 있게 해주는 커스텀 훅
//           - 값을 바꾸는 즉시 localStorage에 동기적으로 저장 (페이지 이동/언마운트 직전에도 안전)
//           - 같은 키를 쓰는 다른 컴포넌트(같은 탭) / 다른 브라우저 탭과 자동 동기화
// 적용 개념: Custom Hooks, useState, useEffect, useRef, useCallback
// 상호작용 연계: AuthContext(유저/회원 목록), BookingPage(좌석 상태, 예매 내역), MyPage, FoodStorePage 등에서 활용

import { useState, useEffect, useCallback, useRef } from 'react';

// 같은 탭 안의 다른 훅 인스턴스에게 "이 키가 바뀌었다"고 알리는 이벤트
// (브라우저의 'storage' 이벤트는 '다른 탭'에서 바뀐 경우에만 발생하기 때문)
const SYNC_EVENT = 'local-storage-sync';

const readRaw = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`localStorage 읽기 실패 (key: ${key})`, error);
        return null;
    }
};

const parseRaw = <T,>(raw: string | null, fallback: T): T => {
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        console.error('localStorage 값 파싱 실패', error);
        return fallback;
    }
};

// 사용 예시
// const [myBookings, setMyBookings] = useLocalStorage<BookingRecord[]>('myBookings', []);
// setMyBookings(prev => [...prev, newBooking]);   // useState처럼 함수형 업데이트 가능
//
// ※ 함수형 업데이트(prev => ...)는 호출한 그 자리에서 '즉시, 한 번' 실행됩니다.
//   (BookingPage.handlePayment처럼 updater 안에서 최신 값을 검사할 때 이 성질을 이용함)
export function useLocalStorage<T>(key: string, initialValue: T) {
    // initialValue로 [] 같은 새 객체가 매 렌더링마다 넘어와도 effect가 다시 돌지 않도록 첫 값만 보관
    const initialRef = useRef<T>(initialValue);
    // 마지막으로 읽거나 쓴 원본 문자열 (바뀌지 않았으면 불필요한 리렌더링을 막기 위한 비교용)
    const rawRef = useRef<string | null>(null);

    // 최초 렌더링 때 localStorage에서 값을 한 번만 읽어옴 (지연 초기화)
    const [storedValue, setStoredValue] = useState<T>(() => {
        const raw = readRaw(key);
        rawRef.current = raw;
        return parseRaw(raw, initialValue);
    });

    // 항상 최신 값을 가리키는 ref: 한 이벤트 핸들러 안에서 set을 여러 번 불러도 값이 누락되지 않게 함
    const latestRef = useRef<T>(storedValue);

    // 값 변경: 즉시 localStorage에 저장하고, 같은 키를 쓰는 다른 인스턴스에게 알림
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            const next = value instanceof Function ? value(latestRef.current) : value;
            const nextRaw = JSON.stringify(next);

            latestRef.current = next;
            rawRef.current = nextRaw;
            setStoredValue(next);

            try {
                localStorage.setItem(key, nextRaw);
            } catch (error) {
                console.error(`localStorage 저장 실패 (key: ${key})`, error);
            }

            window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
        },
        [key]
    );

    // 다른 인스턴스(같은 탭) / 다른 탭에서 값이 바뀌면 내 상태도 갱신
    useEffect(() => {
        const sync = () => {
            const raw = readRaw(key);
            if (raw === rawRef.current) return; // 바뀐 게 없으면 무시 (내가 쓴 값도 여기서 걸러짐)

            rawRef.current = raw;
            const next = parseRaw(raw, initialRef.current);
            latestRef.current = next;
            setStoredValue(next);
        };

        const handleStorage = (e: StorageEvent) => {
            // e.key === null 은 localStorage.clear() 호출 시
            if (e.key === key || e.key === null) sync();
        };

        const handleSync = (e: Event) => {
            if ((e as CustomEvent<{ key: string }>).detail.key === key) sync();
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(SYNC_EVENT, handleSync);

        // 렌더링 ~ 구독 사이에 바뀐 값이 있을 수 있으므로 한 번 맞춰줌
        sync();

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(SYNC_EVENT, handleSync);
        };
    }, [key]);

    // useState와 동일한 [값, 변경 함수] 형태로 반환
    return [storedValue, setValue] as const;
}