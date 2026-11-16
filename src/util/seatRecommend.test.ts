// src/util/seatRecommend.test.ts
// 좌석 자동 추천(recommendSeats)이 의도대로 동작하는지 검사
// 좌석 배치: 가운데 통로를 기준으로 왼쪽 구역(1~5열), 오른쪽 구역(6~10열)
import { describe, it, expect } from 'vitest';
import { recommendSeats } from './seatRecommend';
import { createEmptySeats, SEAT_ROWS, SEATS_PER_ROW } from './schedule';
import type { SeatState } from '../types';

// 지정한 좌석이 예약된 상태의 좌석 맵을 만듦
const makeSeats = (bookedSeats: string[] = []): { [seatId: string]: SeatState } => {
    const seats = createEmptySeats();
    bookedSeats.forEach(id => {
        seats[id] = { ...seats[id], isBooked: true, bookedBy: 'tester' };
    });
    return seats;
};

// 모든 줄의 지정한 열을 예약 처리
const bookColumns = (columns: number[]): string[] =>
    SEAT_ROWS.flatMap(row => columns.map(column => `${row}${column}`));

// 모든 좌석을 예약 처리하고, keepFree로 지정한 좌석만 비워 둠
const makeSeatsWithOnlyFree = (keepFree: string[]): { [seatId: string]: SeatState } => {
    const all: string[] = [];
    SEAT_ROWS.forEach(row => {
        for (let n = 1; n <= SEATS_PER_ROW; n++) all.push(`${row}${n}`);
    });
    return makeSeats(all.filter(id => !keepFree.includes(id)));
};

const columnOf = (seatId: string): number => Number(seatId.slice(1));

describe('recommendSeats - 한 구역 안에서 붙어 앉는 경우', () => {
    it('빈 극장에서 1명이면 통로 바로 옆 중앙 줄(E열) 자리를 추천한다', () => {
        expect(recommendSeats(makeSeats(), 1).seats).toEqual(['E5']);
    });

    it('2명이면 통로 옆에서 같은 구역의 두 자리를 나란히 추천한다 (통로를 넘지 않음)', () => {
        const result = recommendSeats(makeSeats(), 2);
        expect(result.seats).toEqual(['E4', 'E5']);
        expect(result.kind).toBe('together');
    });

    it('4명이면 한 구역 안에서 통로에 가깝게 붙여 추천한다', () => {
        expect(recommendSeats(makeSeats(), 4).seats).toEqual(['E2', 'E3', 'E4', 'E5']);
    });

    it('5명이면 한 구역을 통째로 쓴다', () => {
        const result = recommendSeats(makeSeats(), 5);
        expect(result.seats).toEqual(['E1', 'E2', 'E3', 'E4', 'E5']);
        expect(result.kind).toBe('together');
    });

    it('붙어 앉는 추천(1~5명)은 어떤 경우에도 통로를 넘지 않는다', () => {
        for (let count = 1; count <= 5; count++) {
            const { seats, kind } = recommendSeats(makeSeats(), count);
            expect(kind).toBe('together');
            const inLeft = seats.every(id => columnOf(id) <= 5);
            const inRight = seats.every(id => columnOf(id) >= 6);
            expect(inLeft || inRight).toBe(true);
        }
    });

    it('가운데 구역이 예약돼 있으면 가까운 다른 줄에서 붙은 자리를 추천한다', () => {
        const seats = makeSeats(['E4', 'E5', 'E6', 'E7']);
        expect(recommendSeats(seats, 2).seats).toEqual(['D4', 'D5']);
    });

    it('한쪽 구역에 연속 자리가 없으면 반대쪽 구역에서 붙은 자리를 찾는다', () => {
        // 모든 줄의 3열이 예약됨 -> 왼쪽 구역은 연속 2석까지만 가능
        const result = recommendSeats(makeSeats(bookColumns([3])), 3);
        expect(result.seats).toEqual(['E6', 'E7', 'E8']);
        expect(result.kind).toBe('together');
    });
});

describe('recommendSeats - 통로를 사이에 두고 앉는 경우', () => {
    it('6명이면 같은 줄 통로 양쪽에 3명씩 나눠 앉는다', () => {
        const result = recommendSeats(makeSeats(), 6);
        expect(result.groups).toEqual([['E3', 'E4', 'E5'], ['E6', 'E7', 'E8']]);
        expect(result.kind).toBe('aisle');
    });

    it('최대 인원 8명이면 통로 양쪽에 4명씩 앉는다', () => {
        const result = recommendSeats(makeSeats(), 8);
        expect(result.seats).toEqual(['E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']);
        expect(result.groups).toHaveLength(2);
        expect(result.kind).toBe('aisle');
    });

    it('한 구역 안에 붙은 자리가 없으면 같은 줄 통로 양쪽으로 나눠 추천한다', () => {
        // 모든 줄의 3, 6, 9열이 예약됨 -> 한 줄에 연속으로 남는 자리는 최대 2석
        const seats = makeSeats(bookColumns([3, 6, 9]));
        const result = recommendSeats(seats, 3);
        expect(result.groups).toEqual([['E4', 'E5'], ['E7']]);
        expect(result.kind).toBe('aisle');
    });
});

describe('recommendSeats - 다른 줄로 떨어져 앉는 경우', () => {
    it('같은 줄에 붙은 자리가 없으면 가까운 줄에서 붙은 자리를 먼저 찾는다', () => {
        // E열에는 E5, E6만 남김 -> 3명이 붙어 앉을 수 없으니 D열(스크린 쪽 인접 줄)로 이동
        const seats = makeSeats(['E1', 'E2', 'E3', 'E4', 'E7', 'E8', 'E9', 'E10']);
        const result = recommendSeats(seats, 3);
        expect(result.seats).toEqual(['D3', 'D4', 'D5']);
        expect(result.kind).toBe('together');
    });

    it('좌석이 거의 남지 않아 여러 줄에 흩어져도 같은 좌석을 두 번 고르지 않는다', () => {
        const seats = makeSeats(bookColumns([2, 3, 4, 5, 6, 7, 8, 9]));
        const result = recommendSeats(seats, 7);
        expect(result.seats).toHaveLength(7);
        expect(new Set(result.seats).size).toBe(7);
        expect(result.kind).toBe('apart');
    });
});

describe('recommendSeats - 예외와 안전 장치', () => {
    it('예약 완료 좌석은 절대 추천하지 않는다', () => {
        const booked = ['E4', 'E5', 'E6', 'E7', 'D5', 'D6', 'F5', 'F6', 'A1', 'H10'];
        const seats = makeSeats(booked);
        for (let count = 1; count <= 8; count++) {
            const result = recommendSeats(seats, count);
            expect(result.seats).toHaveLength(count);
            expect(result.seats.some(id => booked.includes(id))).toBe(false);
        }
    });

    it('남은 좌석이 인원보다 적으면 빈 결과를 돌려준다', () => {
        const seats = makeSeatsWithOnlyFree(['A1', 'A2']);
        expect(recommendSeats(seats, 3)).toEqual({ seats: [], groups: [], kind: 'none' });
    });

    it('남은 좌석이 인원과 정확히 같으면 그 좌석을 모두 추천한다', () => {
        const seats = makeSeatsWithOnlyFree(['A1', 'C7', 'H10']);
        const result = recommendSeats(seats, 3);
        expect([...result.seats].sort()).toEqual(['A1', 'C7', 'H10']);
        expect(result.kind).toBe('apart');
    });

    it('인원이 0 이하이거나 정수가 아니면 빈 결과를 돌려준다', () => {
        expect(recommendSeats(makeSeats(), 0).kind).toBe('none');
        expect(recommendSeats(makeSeats(), -1).kind).toBe('none');
        expect(recommendSeats(makeSeats(), 1.5).kind).toBe('none');
    });

    it('받은 seats를 수정하지 않는다 (순수 함수)', () => {
        const seats = makeSeats(['E5']);
        const snapshot = JSON.parse(JSON.stringify(seats));
        recommendSeats(seats, 4);
        expect(seats).toEqual(snapshot);
    });

    it('같은 입력이면 항상 같은 결과를 돌려준다', () => {
        const seats = makeSeats(['E5', 'D3']);
        expect(recommendSeats(seats, 3)).toEqual(recommendSeats(seats, 3));
    });
});