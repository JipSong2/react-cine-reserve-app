// src/components/TicketModal.tsx
// 주요 기능: 예매 내역 한 건을 영화 티켓 모양으로 보여주는 팝업 (포스터, 제목, 날짜, 시간, 인원, 좌석, 결제 금액, 예매번호)
// 적용 개념: Props 전달, useRef (모달이 열릴 때 '닫기' 버튼에 자동 focus()), useEffect (ESC 키 처리), 조건부 스타일링
// 상호작용 연계: MyPage.tsx의 '내 예매 내역'에서 예매를 누르면 띄움. 닫기는 배경 클릭, ESC 키, '닫기' 버튼으로 가능.

import { useRef, useEffect } from 'react';
import type { BookingRecord } from '../types';
import { getImageUrl } from '../services/tmdbAPI';
import { formatDateWithDay, isPastSchedule } from '../util/schedule';

interface TicketModalProps {
    booking: BookingRecord | null; // null이면 팝업을 닫아 둠
    onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ booking, onClose }) => {
    // 팝업이 열릴 때 '닫기' 버튼에 자동 포커스 (키보드로 바로 닫을 수 있음)
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const isOpen = booking !== null;

    useEffect(() => {
        if (isOpen) {
            closeButtonRef.current?.focus();
        }
    }, [isOpen]);

    // ESC 키로 팝업 닫기
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 닫혀 있으면 아무것도 렌더링하지 않음
    if (!booking) return null;

    const posterUrl = getImageUrl(booking.posterPath, 'w185');
    const isPast = isPastSchedule(booking.scheduleDate, booking.scheduleTime);

    // 인원: 청소년이 0명이면 '성인 2명'처럼 있는 것만 표시
    const headCountText = [
        booking.headCount.adult > 0 ? `성인 ${booking.headCount.adult}명` : '',
        booking.headCount.youth > 0 ? `청소년 ${booking.headCount.youth}명` : '',
    ]
        .filter(Boolean)
        .join(', ');

    // 예매번호: 긴 고유 id의 앞 8자리만 대문자로 표시
    // (예전 데이터처럼 숫자 id가 남아 있어도 깨지지 않도록 문자열로 바꿔서 처리)
    const bookingCode = String(booking.bookingId).slice(0, 8).toUpperCase();

    return (
        // 어두운 배경 클릭 시 닫기
        <div className="modal-overlay" onClick={onClose}>
            {/* 티켓 내부 클릭은 배경 클릭으로 전달되지 않도록 막음 */}
            <div
                className="ticket-wrap"
                role="dialog"
                aria-modal="true"
                aria-label={`${booking.movieTitle} 예매 티켓`}
                onClick={e => e.stopPropagation()}
            >
                <div className="ticket-shadow">
                    {/* 이미 상영이 끝난 회차는 회색 띠로 표시 */}
                    <div className={isPast ? 'ticket ticket-past' : 'ticket'}>
                        <div className="ticket-main">
                            <div className="ticket-band">
                                <span className="ticket-brand">CINE RESERVE</span>
                                <span className="ticket-kind">{isPast ? '상영 종료' : '영화 입장권'}</span>
                            </div>

                            <div className="ticket-body">
                                {posterUrl ? (
                                    <img
                                        className="ticket-poster"
                                        src={posterUrl}
                                        alt={`${booking.movieTitle} 포스터`}
                                    />
                                ) : (
                                    <div className="ticket-poster ticket-poster-empty">포스터 없음</div>
                                )}

                                <div className="ticket-details">
                                    <h2 className="ticket-title">{booking.movieTitle}</h2>

                                    <dl className="ticket-grid">
                                        <div>
                                            <dt>날짜</dt>
                                            <dd>{formatDateWithDay(booking.scheduleDate)}</dd>
                                        </div>
                                        <div>
                                            <dt>시간</dt>
                                            <dd>{booking.scheduleTime}</dd>
                                        </div>
                                        <div>
                                            <dt>인원</dt>
                                            <dd>{headCountText}</dd>
                                        </div>
                                        <div>
                                            <dt>좌석</dt>
                                            <dd>{booking.selectedSeats.join(', ')}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* 절취선 오른쪽 조각 */}
                        <div className="ticket-stub">
                            <dl className="ticket-stub-row">
                                <div>
                                    <dt>예매번호</dt>
                                    <dd className="ticket-code">{bookingCode}</dd>
                                </div>
                                <div>
                                    <dt>결제 금액</dt>
                                    <dd>{booking.totalPrice.toLocaleString()}원</dd>
                                </div>
                            </dl>
                            <div className="ticket-barcode" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                <button ref={closeButtonRef} type="button" className="ticket-close" onClick={onClose}>
                    닫기
                </button>
            </div>
        </div>
    );
};

export default TicketModal;