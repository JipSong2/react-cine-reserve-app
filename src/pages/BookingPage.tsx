// src/pages/BookingPage.tsx (예매 핵심 프로세스)
// 주요 기능: [1단계: 날짜/시간 선택] -> [2단계: 인원 선택] -> [3단계: 좌석 선택 (SeatGrid)]
//           -> [4단계: 금액 계산 및 결제 완료]
// 적용 개념: useState (단계 및 선택값), useMemo (총 결제금액 연산 최적화),
//           useLocalStorage (좌석 상태 및 예매 내역 저장), useCallback
// 상호작용 연계: useParams를 통해 HomePage로부터 넘겨받은 movieId 조율.
//               예매 완료 시 좌석 상태(cine_schedules)와 myBookings를 localStorage에 저장.
//               미로그인 상태에서 예매하면 LoginModal을 팝업으로 띄움.
//               결제가 끝나면 FoodSuggestModal로 매점 이용을 권유하고, 동의하면 /food, 아니면 /mypage로 이동.

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getImageUrl } from '../services/tmdbAPI';
import { useMovieDetail } from '../hooks/useMovieDetail';
import {
    SHOW_TIMES,
    getAvailableDates,
    generateScheduleId,
    createEmptySeats,
    formatDateWithDay,
} from '../util/schedule';
import { createId } from '../util/id';
import SeatGrid from '../components/SeatGrid';
import LoginModal from '../components/LoginModal';
import FoodSuggestModal from '../components/FoodSuggestModal';
import type { BookingRecord, FoodRecommendState, MovieSchedule } from '../types';

// ─────────────────────────────────────────────
// 상수 및 유틸
// ─────────────────────────────────────────────
const TICKET_PRICE = { adult: 14000, youth: 11000 } as const; // 1인 요금
const MAX_HEAD_COUNT = 8; // 한 번에 예매 가능한 최대 인원
const LOGIN_REQUIRED_MESSAGE = '예매는 로그인 후 이용할 수 있습니다.';

const STEP_LABELS = ['날짜/시간', '인원', '좌석', '결제'];

const BookingPage: React.FC = () => {
    const { movieId } = useParams<{ movieId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const numericMovieId = Number(movieId);

    // ── 영화 정보 (hooks/useMovieDetail) ──
    const { movie, isLoading, error: loadError } = useMovieDetail(numericMovieId);

    // ── 예매 진행 상태 ──
    const [step, setStep] = useState<number>(1);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [headCount, setHeadCount] = useState({ adult: 1, youth: 0 });
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [message, setMessage] = useState<string>('');
    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
    // 결제 중복 클릭 방지: ref는 즉시 차단용, state는 버튼 비활성화(화면 표시)용
    const isPayingRef = useRef<boolean>(false);
    const [isPaying, setIsPaying] = useState<boolean>(false);
    // 결제가 끝나면 값이 채워지고, 매점 이용을 권유하는 모달이 열림
    const [completedBooking, setCompletedBooking] = useState<FoodRecommendState | null>(null);

    // ── localStorage 저장 데이터 ──
    // 회차별 좌석 상태: { [scheduleId]: MovieSchedule }
    const [schedules, setSchedules] = useLocalStorage<{ [scheduleId: string]: MovieSchedule }>(
        'cine_schedules',
        {}
    );
    // 내 예매 내역
    const [, setMyBookings] = useLocalStorage<BookingRecord[]>('myBookings', []);

    // 선택 가능한 날짜 목록 (내일부터 7일)
    const availableDates = useMemo(() => getAvailableDates(), []);

    // ── 파생 값 ──
    const scheduleId =
        selectedDate && selectedTime
            ? generateScheduleId(numericMovieId, selectedDate, selectedTime)
            : '';

    // 선택한 회차의 좌석 데이터 (저장된 적 없으면 빈 좌석으로 생성)
    const currentSchedule = useMemo<MovieSchedule | null>(() => {
        if (!scheduleId) return null;
        return (
            schedules[scheduleId] ?? {
                scheduleId,
                movieId: numericMovieId,
                date: selectedDate,
                time: selectedTime,
                seats: createEmptySeats(),
            }
        );
    }, [schedules, scheduleId, numericMovieId, selectedDate, selectedTime]);

    const totalHeadCount = headCount.adult + headCount.youth;

    // 총 결제금액: 인원이 바뀔 때만 다시 계산
    const totalPrice = useMemo(
        () => headCount.adult * TICKET_PRICE.adult + headCount.youth * TICKET_PRICE.youth,
        [headCount]
    );

    // ── 핸들러 ──
    // SeatGrid의 onChange에 넘기므로 useCallback으로 고정
    const handleSeatChange = useCallback((seats: string[]) => {
        setSelectedSeats(seats);
    }, []);

    // 로그인 여부 확인: 미로그인이면 로그인 모달을 띄우고 false 반환
    const requireLogin = (): boolean => {
        if (user) return true;
        setMessage(LOGIN_REQUIRED_MESSAGE);
        setIsLoginOpen(true);
        return false;
    };

    // 날짜/시간이 바뀌면 다른 회차이므로, 이전에 고른 좌석은 비움
    const handleSelectDate = (date: string) => {
        if (date === selectedDate) return;
        setSelectedDate(date);
        setSelectedSeats([]);
    };

    const handleSelectTime = (time: string) => {
        if (time === selectedTime) return;
        setSelectedTime(time);
        setSelectedSeats([]);
    };

    const changeHeadCount = (type: 'adult' | 'youth', delta: number) => {
        setHeadCount(prev => {
            const next = prev[type] + delta;
            const nextTotal = prev.adult + prev.youth + delta;
            if (next < 0 || nextTotal > MAX_HEAD_COUNT) return prev;
            return { ...prev, [type]: next };
        });
    };

    const goNext = () => {
        setMessage('');

        if (step === 1) {
            if (!selectedDate || !selectedTime) {
                setMessage('날짜와 시간을 선택해주세요.');
                return;
            }
            if (!requireLogin()) return;
        }

        if (step === 2 && totalHeadCount < 1) {
            setMessage('최소 1명 이상 선택해주세요.');
            return;
        }

        if (step === 3 && selectedSeats.length !== totalHeadCount) {
            setMessage(`좌석을 ${totalHeadCount}개 선택해주세요.`);
            return;
        }

        setStep(prev => prev + 1);
    };

    const goPrev = () => {
        setMessage('');
        setStep(prev => prev - 1);
    };

    // 결제 완료 처리
    const handlePayment = () => {
        // 중복 클릭 방지: state는 다음 렌더링 뒤에야 바뀌므로, 즉시 반영되는 ref로 먼저 차단
        if (isPayingRef.current) return;
        if (!requireLogin() || !user || !movie || !currentSchedule) return;

        isPayingRef.current = true;
        setIsPaying(true);

        // 1) 좌석 상태 저장: '지금 저장된 최신 값(prev)' 기준으로 다시 검사한 뒤 예약 처리
        //    (렌더링 때 들고 있던 값은 다른 탭에서 바뀌었을 수 있음)
        //    useLocalStorage의 updater는 호출 즉시 실행되므로, 아래 result로 결과를 바로 확인할 수 있음
        const result = { conflict: false };
        setSchedules(prev => {
            const latest = prev[currentSchedule.scheduleId] ?? currentSchedule;

            if (selectedSeats.some(seatId => latest.seats[seatId]?.isBooked)) {
                result.conflict = true;
                return prev; // 아무것도 바꾸지 않음
            }

            const updatedSeats = { ...latest.seats };
            selectedSeats.forEach(seatId => {
                updatedSeats[seatId] = { ...updatedSeats[seatId], isBooked: true, bookedBy: user.id };
            });

            return {
                ...prev,
                [latest.scheduleId]: { ...latest, seats: updatedSeats },
            };
        });

        if (result.conflict) {
            isPayingRef.current = false;
            setIsPaying(false);
            setMessage('선택한 좌석 중 이미 예약된 좌석이 있습니다. 좌석을 다시 선택해주세요.');
            setSelectedSeats([]);
            setStep(3);
            return;
        }

        // 2) 예매 내역 저장
        const newBooking: BookingRecord = {
            bookingId: createId(),
            userId: user.id,
            movieId: movie.id,
            movieTitle: movie.title,
            posterPath: movie.poster_path,
            scheduleDate: selectedDate,
            scheduleTime: selectedTime,
            selectedSeats,
            headCount,
            totalPrice,
            bookedAt: new Date().toISOString(),
        };
        setMyBookings(prev => [...prev, newBooking]);

        // 3) 바로 이동하지 않고, 매점 이용을 먼저 권유 (이동은 아래 두 핸들러에서 처리)
        setCompletedBooking({ movieTitle: movie.title, headCount: totalHeadCount });
    };

    // 매점 권유에 동의: 매점으로 이동 (예매 정보를 함께 넘겨 안내 문구에 사용)
    // replace: 뒤로 가기로 이미 끝난 예매 화면에 돌아오지 않도록 현재 기록을 교체
    const handleAcceptFood = () => {
        if (!completedBooking) return;
        navigate('/food', { replace: true, state: completedBooking });
    };

    // 매점 권유를 사양: 예매 내역(마이페이지)으로 이동
    const handleDeclineFood = useCallback(() => {
        navigate('/mypage', { replace: true });
    }, [navigate]);

    // ── 렌더링 ──
    if (isLoading) return <p className="status-message">영화 정보를 불러오는 중입니다...</p>;
    if (loadError || !movie) {
        return <p className="status-message status-error">{loadError ?? '영화 정보가 없습니다.'}</p>;
    }

    const posterUrl = getImageUrl(movie.poster_path, 'w185');

    // 로그인에 성공했다면 '로그인 후 이용하세요' 안내 문구는 더 이상 보여주지 않음
    const visibleMessage = user && message === LOGIN_REQUIRED_MESSAGE ? '' : message;

    return (
        <div className="booking-page">
            {/* 영화 정보 */}
            <div className="booking-movie">
                {posterUrl && <img src={posterUrl} alt={`${movie.title} 포스터`} />}
                <h2>{movie.title}</h2>
            </div>

            {/* 단계 표시 */}
            <ol className="step-indicator">
                {STEP_LABELS.map((label, index) => (
                    <li key={label} className={step === index + 1 ? 'step active' : 'step'}>
                        {index + 1}. {label}
                    </li>
                ))}
            </ol>

            {/* 1단계: 날짜/시간 선택 */}
            {step === 1 && (
                <section className="booking-step">
                    <h3>날짜 선택</h3>
                    <div className="option-list">
                        {availableDates.map(date => (
                            <button
                                key={date}
                                type="button"
                                className={selectedDate === date ? 'option active' : 'option'}
                                onClick={() => handleSelectDate(date)}
                            >
                                {formatDateWithDay(date)}
                            </button>
                        ))}
                    </div>

                    <h3>시간 선택</h3>
                    <div className="option-list">
                        {SHOW_TIMES.map(time => (
                            <button
                                key={time}
                                type="button"
                                className={selectedTime === time ? 'option active' : 'option'}
                                onClick={() => handleSelectTime(time)}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 2단계: 인원 선택 */}
            {step === 2 && (
                <section className="booking-step">
                    <h3>인원 선택 (최대 {MAX_HEAD_COUNT}명)</h3>

                    <div className="counter-row">
                        <span>성인 ({TICKET_PRICE.adult.toLocaleString()}원)</span>
                        <button type="button" onClick={() => changeHeadCount('adult', -1)}>-</button>
                        <span>{headCount.adult}</span>
                        <button type="button" onClick={() => changeHeadCount('adult', 1)}>+</button>
                    </div>

                    <div className="counter-row">
                        <span>청소년 ({TICKET_PRICE.youth.toLocaleString()}원)</span>
                        <button type="button" onClick={() => changeHeadCount('youth', -1)}>-</button>
                        <span>{headCount.youth}</span>
                        <button type="button" onClick={() => changeHeadCount('youth', 1)}>+</button>
                    </div>

                    <p>예상 금액: {totalPrice.toLocaleString()}원</p>
                </section>
            )}

            {/* 3단계: 좌석 선택 */}
            {step === 3 && currentSchedule && (
                <section className="booking-step">
                    <h3>좌석 선택 ({selectedSeats.length} / {totalHeadCount})</h3>
                    <SeatGrid
                        key={currentSchedule.scheduleId}
                        seats={currentSchedule.seats}
                        maxSelectable={totalHeadCount}
                        onChange={handleSeatChange}
                        initialSelectedSeats={selectedSeats}
                    />
                </section>
            )}

            {/* 4단계: 결제 확인 */}
            {step === 4 && (
                <section className="booking-step">
                    <h3>예매 정보 확인</h3>
                    <ul className="booking-summary">
                        <li>영화: {movie.title}</li>
                        <li>일시: {formatDateWithDay(selectedDate)} {selectedTime}</li>
                        <li>인원: 성인 {headCount.adult}명, 청소년 {headCount.youth}명</li>
                        <li>좌석: {selectedSeats.join(', ')}</li>
                        <li className="booking-total">결제 금액: {totalPrice.toLocaleString()}원</li>
                    </ul>
                </section>
            )}

            {visibleMessage && <p className="booking-message">{visibleMessage}</p>}

            {/* 이전 / 다음 / 결제 버튼 */}
            <div className="booking-buttons">
                {step > 1 && (
                    <button type="button" onClick={goPrev}>이전</button>
                )}
                {step < 4 ? (
                    <button type="button" onClick={goNext}>다음</button>
                ) : (
                    <button type="button" onClick={handlePayment} disabled={isPaying}>
                        {isPaying ? '결제 중...' : '결제하기'}
                    </button>
                )}
            </div>

            {/* 미로그인 시 팝업 */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            {/* 결제 완료 후 매점 이용 권유 */}
            <FoodSuggestModal
                isOpen={completedBooking !== null}
                movieTitle={completedBooking?.movieTitle ?? ''}
                headCount={completedBooking?.headCount ?? 0}
                onAccept={handleAcceptFood}
                onDecline={handleDeclineFood}
            />
        </div>
    );
};

export default BookingPage;