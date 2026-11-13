// src/components/SeatGrid.tsx
// 주요 기능: A1~H10 좌석 배치도 렌더링, 예약 완료 좌석(Disabled) 및 선택 좌석(Selected) 시각화
// 적용 개념: useState, useCallback (좌석 클릭 토글 리렌더링 방지), 조건부 스타일링
// 상호작용 연계: BookingPage.tsx 내부 3단계(좌석 선택) 화면에 배치되어,
//               사용자가 고른 좌석 상태를 부모(BookingPage)로 전달.

import { memo, useState, useCallback, useEffect } from 'react';
import type { SeatState } from '../types';
import { SEAT_ROWS, SEATS_PER_ROW } from '../util/schedule';

interface SeatGridProps {
    seats: { [seatId: string]: SeatState }; // MovieSchedule.seats (예약 완료 여부 확인용)
    maxSelectable: number; // 선택 가능한 최대 좌석 수 (예매 인원 합계)
    onChange: (selectedSeats: string[]) => void; // 선택 좌석이 바뀔 때 부모에게 전달
    initialSelectedSeats?: string[]; // 처음부터 선택되어 있을 좌석 (이전 단계로 갔다가 돌아왔을 때 유지용)
}

// ─────────────────────────────────────────────
// 좌석 하나 (memo: 상태가 바뀐 좌석만 리렌더링)
// ─────────────────────────────────────────────
interface SeatButtonProps {
    seatId: string;
    isBooked: boolean;
    isSelected: boolean;
    isDisabled: boolean;
    onToggle: (seatId: string) => void;
}

const SeatButton = memo(({ seatId, isBooked, isSelected, isDisabled, onToggle }: SeatButtonProps) => {
    // 조건부 스타일링: 예약 완료 / 선택됨 / 선택 가능
    const className = [
        'seat',
        isBooked ? 'seat-booked' : '',
        isSelected ? 'seat-selected' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type="button"
            className={className}
            disabled={isDisabled}
            onClick={() => onToggle(seatId)}
            aria-label={`${seatId} 좌석${isBooked ? ' (예약 완료)' : ''}`}
        >
            {seatId}
        </button>
    );
});

// ─────────────────────────────────────────────
// 좌석 배치도 전체
// ─────────────────────────────────────────────
// 사용 예시 (BookingPage에서)
// const handleSeatChange = useCallback((seats: string[]) => setSelectedSeats(seats), []);
// <SeatGrid seats={schedule.seats} maxSelectable={adult + youth} onChange={handleSeatChange}
//           initialSelectedSeats={selectedSeats} />
const SeatGrid: React.FC<SeatGridProps> = ({
    seats,
    maxSelectable,
    onChange,
    initialSelectedSeats = [],
}) => {
    // 처음 한 번만 계산: 이미 예약된 좌석이나 인원 초과분은 제외하고 이전 선택을 이어받음
    const [selectedSeats, setSelectedSeats] = useState<string[]>(() =>
        initialSelectedSeats.filter(seatId => !seats[seatId]?.isBooked).slice(0, maxSelectable)
    );

    // 좌석 클릭 토글: 이미 선택했으면 해제, 아니면 최대 인원 안에서 추가
    // 함수형 업데이트를 써서 selectedSeats에 의존하지 않으므로 함수가 매번 새로 만들어지지 않음
    const handleToggle = useCallback(
        (seatId: string) => {
            setSelectedSeats(prev => {
                if (prev.includes(seatId)) {
                    return prev.filter(id => id !== seatId);
                }
                if (prev.length >= maxSelectable) {
                    return prev; // 인원 수를 넘는 선택은 무시
                }
                return [...prev, seatId];
            });
        },
        [maxSelectable]
    );

    // 인원 수가 줄어들어 선택 좌석이 더 많아지면 초과분 제거
    useEffect(() => {
        setSelectedSeats(prev => (prev.length > maxSelectable ? prev.slice(0, maxSelectable) : prev));
    }, [maxSelectable]);

    // 선택해 둔 좌석이 (다른 탭 등에서) 먼저 예약되면 선택에서 제거
    useEffect(() => {
        setSelectedSeats(prev => {
            const next = prev.filter(seatId => !seats[seatId]?.isBooked);
            return next.length === prev.length ? prev : next;
        });
    }, [seats]);

    // 선택 좌석이 바뀔 때마다 부모에게 전달
    useEffect(() => {
        onChange(selectedSeats);
    }, [selectedSeats, onChange]);

    const isLimitReached = selectedSeats.length >= maxSelectable;

    return (
        <div className="seat-grid">
            <div className="seat-screen">SCREEN</div>

            {SEAT_ROWS.map(row => (
                <div key={row} className="seat-row">
                    {Array.from({ length: SEATS_PER_ROW }, (_, index) => {
                        const seatId = `${row}${index + 1}`;
                        const isBooked = seats[seatId]?.isBooked ?? false;
                        const isSelected = selectedSeats.includes(seatId);

                        return (
                            <SeatButton
                                key={seatId}
                                seatId={seatId}
                                isBooked={isBooked}
                                isSelected={isSelected}
                                // 예약 완료 좌석이거나, 인원 한도에 도달했는데 선택되지 않은 좌석은 비활성화
                                isDisabled={isBooked || (isLimitReached && !isSelected)}
                                onToggle={handleToggle}
                            />
                        );
                    })}
                </div>
            ))}

            <div className="seat-legend">
                <span className="seat seat-legend-item">선택 가능</span>
                <span className="seat seat-selected seat-legend-item">선택됨</span>
                <span className="seat seat-booked seat-legend-item">예약 완료</span>
            </div>
        </div>
    );
};

export default SeatGrid;