// src/util/schedule.test.ts
// 상영 일정 유틸(날짜 목록, 좌석 생성, 지난 회차 판별, 좌석 반환)이 맞게 동작하는지 검사
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    SHOW_TIMES,
    getAvailableDates,
    generateScheduleId,
    createEmptySeats,
    isPastSchedule,
    formatDateWithDay,
    releaseSeats,
} from './schedule';
import type { ScheduleMap } from './schedule';
import type { BookingRecord, MovieSchedule } from '../types';

// "지금" 시각을 고정: 날짜에 의존하는 테스트가 언제 돌려도 같은 결과가 나오게 함
const setNow = (year: number, month: number, day: number, hour = 12) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(year, month - 1, day, hour, 0, 0));
};

afterEach(() => {
    vi.useRealTimers();
});

describe('generateScheduleId', () => {
    it('영화 id, 날짜, 시간으로 회차 키를 만든다', () => {
        expect(generateScheduleId(1053359, '2026-11-10', '15:00')).toBe('MOVIE_1053359_2026-11-10_15:00');
    });
});

describe('createEmptySeats', () => {
    it('A1~H10, 총 80석이 모두 예약 가능 상태로 만들어진다', () => {
        const seats = createEmptySeats();
        expect(Object.keys(seats)).toHaveLength(80);
        expect(Object.values(seats).every(seat => !seat.isBooked)).toBe(true);
        expect(seats['A1']).toEqual({ id: 'A1', row: 'A', number: 1, isBooked: false });
        expect(seats['H10']).toEqual({ id: 'H10', row: 'H', number: 10, isBooked: false });
    });
});

describe('getAvailableDates', () => {
    it('내일부터 7일간의 날짜를 돌려준다', () => {
        setNow(2026, 11, 13);
        const dates = getAvailableDates();
        expect(dates).toHaveLength(7);
        expect(dates[0]).toBe('2026-11-14');
        expect(dates[6]).toBe('2026-11-20');
    });

    it('월이 바뀌어도 맞다', () => {
        setNow(2026, 11, 30);
        const dates = getAvailableDates();
        expect(dates[0]).toBe('2026-12-01');
        expect(dates[6]).toBe('2026-12-07');
    });

    it('해가 바뀌어도 맞다', () => {
        setNow(2026, 12, 28);
        const dates = getAvailableDates();
        expect(dates[0]).toBe('2026-12-29');
        expect(dates[6]).toBe('2027-01-04');
    });
});

describe('isPastSchedule', () => {
    it('이미 시작했거나 시작 시각인 회차는 지난 회차로 본다', () => {
        setNow(2026, 11, 13, 12);
        expect(isPastSchedule('2026-11-13', '09:00')).toBe(true);
        expect(isPastSchedule('2026-11-13', '12:00')).toBe(true);
    });

    it('아직 시작 전인 회차는 지난 회차가 아니다', () => {
        setNow(2026, 11, 13, 12);
        expect(isPastSchedule('2026-11-13', '15:00')).toBe(false);
        expect(isPastSchedule('2026-11-14', '09:00')).toBe(false);
    });

    it('상영 시간표(SHOW_TIMES)의 모든 값이 올바른 시각으로 해석된다', () => {
        setNow(2026, 11, 13, 0);
        SHOW_TIMES.forEach(time => {
            expect(isPastSchedule('2026-11-13', time)).toBe(false);
        });
    });
});

describe('formatDateWithDay', () => {
    it('날짜 뒤에 요일을 붙인다', () => {
        expect(formatDateWithDay('2026-11-10')).toBe('2026-11-10 (화)');
        expect(formatDateWithDay('2026-11-13')).toBe('2026-11-13 (금)');
    });
});

// ─────────────────────────────────────────────
// releaseSeats
// ─────────────────────────────────────────────
const makeSchedule = (movieId: number, date: string, time: string, bookedSeats: string[]): MovieSchedule => {
    const seats = createEmptySeats();
    bookedSeats.forEach(id => {
        seats[id] = { ...seats[id], isBooked: true, bookedBy: 'tester' };
    });
    const scheduleId = generateScheduleId(movieId, date, time);
    return { scheduleId, movieId, date, time, seats };
};

const makeBooking = (movieId: number, date: string, time: string, seats: string[]): BookingRecord => ({
    bookingId: 'booking-1',
    userId: 'tester',
    movieId,
    movieTitle: '테스트 영화',
    posterPath: null,
    scheduleDate: date,
    scheduleTime: time,
    selectedSeats: seats,
    headCount: { adult: seats.length, youth: 0 },
    totalPrice: seats.length * 14000,
    bookedAt: '2026-11-13T00:00:00.000Z',
});

describe('releaseSeats', () => {
    it('취소한 예매의 좌석만 예약 가능 상태로 되돌린다', () => {
        const schedule = makeSchedule(1, '2026-11-14', '15:00', ['A1', 'A2', 'B1']);
        const schedules: ScheduleMap = { [schedule.scheduleId]: schedule };

        const next = releaseSeats(schedules, [makeBooking(1, '2026-11-14', '15:00', ['A1', 'A2'])]);
        const seats = next[schedule.scheduleId].seats;

        expect(seats['A1'].isBooked).toBe(false);
        expect(seats['A1'].bookedBy).toBeUndefined();
        expect(seats['A2'].isBooked).toBe(false);
        expect(seats['B1'].isBooked).toBe(true); // 다른 예매의 좌석은 그대로
    });

    it('원본 schedules를 수정하지 않는다 (순수 함수)', () => {
        const schedule = makeSchedule(1, '2026-11-14', '15:00', ['A1']);
        const schedules: ScheduleMap = { [schedule.scheduleId]: schedule };

        releaseSeats(schedules, [makeBooking(1, '2026-11-14', '15:00', ['A1'])]);

        expect(schedules[schedule.scheduleId].seats['A1'].isBooked).toBe(true);
    });

    it('다른 회차는 건드리지 않는다', () => {
        const target = makeSchedule(1, '2026-11-14', '15:00', ['A1']);
        const other = makeSchedule(1, '2026-11-14', '18:00', ['A1']);
        const schedules: ScheduleMap = { [target.scheduleId]: target, [other.scheduleId]: other };

        const next = releaseSeats(schedules, [makeBooking(1, '2026-11-14', '15:00', ['A1'])]);

        expect(next[target.scheduleId].seats['A1'].isBooked).toBe(false);
        expect(next[other.scheduleId].seats['A1'].isBooked).toBe(true);
    });

    it('저장되지 않은 회차나 없는 좌석이 있어도 에러 없이 넘어간다', () => {
        const schedule = makeSchedule(1, '2026-11-14', '15:00', ['A1']);
        const schedules: ScheduleMap = { [schedule.scheduleId]: schedule };

        const next = releaseSeats(schedules, [
            makeBooking(999, '2026-11-14', '15:00', ['A1']), // 없는 회차
            makeBooking(1, '2026-11-14', '15:00', ['Z99']), // 없는 좌석
        ]);

        expect(next[schedule.scheduleId].seats['A1'].isBooked).toBe(true);
    });

    it('여러 예매를 한 번에 반환할 수 있다 (회원 탈퇴 상황)', () => {
        const s1 = makeSchedule(1, '2026-11-14', '15:00', ['A1', 'A2']);
        const s2 = makeSchedule(2, '2026-11-15', '18:00', ['C3']);
        const schedules: ScheduleMap = { [s1.scheduleId]: s1, [s2.scheduleId]: s2 };

        const next = releaseSeats(schedules, [
            makeBooking(1, '2026-11-14', '15:00', ['A1', 'A2']),
            makeBooking(2, '2026-11-15', '18:00', ['C3']),
        ]);

        expect(next[s1.scheduleId].seats['A1'].isBooked).toBe(false);
        expect(next[s1.scheduleId].seats['A2'].isBooked).toBe(false);
        expect(next[s2.scheduleId].seats['C3'].isBooked).toBe(false);
    });
});