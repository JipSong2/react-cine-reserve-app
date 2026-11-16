// src/util/schedule.ts
// 주요 기능: 상영 시간, 예매 가능 날짜, 회차 고유 키, 좌석 초기 데이터 등 상영 일정 관련 유틸
// 상호작용 연계: BookingPage.tsx(날짜/시간 선택, 회차 키, 빈 좌석 생성),
//               MyPage.tsx(예매 취소/회원 탈퇴 시 좌석 반환(releaseSeats), 상영 종료 여부), SeatGrid.tsx(좌석 행/열 수),
//               TicketModal.tsx(날짜 표기)에서 사  용.

import type { SeatState, MovieSchedule, BookingRecord } from '../types';

export const SHOW_TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00'] as const;

// 좌석 배치: A1 ~ H10
export const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export const SEATS_PER_ROW = 10;

// 접속한 날짜를 기준으로 내일부터 7일간의 날짜 (YYYY-MM-DD) 목록 반환
export const getAvailableDates = (): string[] => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);

        const year = nextDate.getFullYear();
        const month = String(nextDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDate.getDate()).padStart(2, '0');

        dates.push(`${year}-${month}-${day}`);
    }

    return dates;
};

/**
 * 특정 상영 회차 고유 키 생성 유틸리티
 */
export const generateScheduleId = (movieId: number, date: string, time: string): string => {
    return `MOVIE_${movieId}_${date}_${time}`;
};

/**
 * A1~H10 전부 비어 있는(예약되지 않은) 좌석 데이터 생성
 */
export const createEmptySeats = (): { [seatId: string]: SeatState } => {
    const seats: { [seatId: string]: SeatState } = {};

    SEAT_ROWS.forEach(row => {
        for (let number = 1; number <= SEATS_PER_ROW; number++) {
            const id = `${row}${number}`;
            seats[id] = { id, row, number, isBooked: false };
        }
    });

    return seats;
};

/**
 * 이미 상영이 시작된(지난) 회차인지 확인
 */
export const isPastSchedule = (date: string, time: string): boolean => {
    return new Date(`${date}T${time}:00`).getTime() <= Date.now();
};

/**
 * 'YYYY-MM-DD' -> '2026-11-10 (화)'
 */
export const formatDateWithDay = (date: string): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[new Date(`${date}T00:00:00`).getDay()];
    return `${date} (${day})`;
};

// 회차별 좌석 상태 맵: { [scheduleId]: MovieSchedule }
export type ScheduleMap = { [scheduleId: string]: MovieSchedule };

/**
 * 예매 내역에 해당하는 좌석을 다시 '예약 가능' 상태로 되돌린 새 스케줄 맵을 반환 (순수 함수)
 * - 원본(schedules)은 건드리지 않고 새 객체를 만들어 돌려줌
 * - 저장돼 있지 않은 회차나, 없는 좌석은 건너뜀
 */
export const releaseSeats = (schedules: ScheduleMap, bookings: BookingRecord[]): ScheduleMap => {
    const next: ScheduleMap = { ...schedules };

    bookings.forEach(booking => {
        const scheduleId = generateScheduleId(
            booking.movieId,
            booking.scheduleDate,
            booking.scheduleTime
        );
        const schedule = next[scheduleId];
        if (!schedule) return;

        const seats = { ...schedule.seats };
        booking.selectedSeats.forEach(seatId => {
            if (seats[seatId]) {
                seats[seatId] = { ...seats[seatId], isBooked: false, bookedBy: undefined };
            }
        });
        next[scheduleId] = { ...schedule, seats };
    });

    return next;
};