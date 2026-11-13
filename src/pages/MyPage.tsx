// src/pages/MyPage.tsx (마이페이지 & 회원 관리)
// 주요 기능: 내 정보 확인 및 수정('정보 수정' 버튼을 눌렀을 때만 수정 폼 표시), 내 예매 내역 확인 /
//           예매를 누르면 티켓 모양으로 보기 / 예매 취소, 회원 탈퇴
// 적용 개념: useContext (AuthContext), useState, useEffect, useRef (수정 폼이 열리면 이름 입력창에 focus())
// 상호작용 연계: AuthContext와 로컬스토리지 myBookings 데이터를 읽어와 표시.
//               예매를 누르면 TicketModal.tsx로 티켓을 띄움. 예매 취소 시 좌석 데이터 복구.
//               예매 취소와 회원 탈퇴는 확인 팝업(ConfirmModal)에서 동의했을 때만 진행.

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getImageUrl } from '../services/tmdbAPI';
import { isPastSchedule, releaseSeats } from '../util/schedule';
import type { ScheduleMap } from '../util/schedule';
import LoginModal from '../components/LoginModal';
import TicketModal from '../components/TicketModal';
import ConfirmModal from '../components/ConfirmModal';
import type { BookingRecord, FoodOrder } from '../types';

const MyPage: React.FC = () => {
    // 회원 정보 수정/탈퇴는 AuthContext가 담당
    const { user, updateProfile, withdraw } = useAuth();
    const navigate = useNavigate();

    // localStorage 데이터
    const [myBookings, setMyBookings] = useLocalStorage<BookingRecord[]>('myBookings', []);
    const [, setSchedules] = useLocalStorage<ScheduleMap>('cine_schedules', {});
    const [foodOrders, setFoodOrders] = useLocalStorage<FoodOrder[]>('foodOrders', []);

    // 내 정보 수정 폼 상태: '정보 수정' 버튼을 눌렀을 때만 폼을 보여줌
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // 티켓으로 보고 있는 예매 (null이면 티켓 창이 닫혀 있음)
    const [ticketBooking, setTicketBooking] = useState<BookingRecord | null>(null);

    // 확인 팝업 상태: 취소하려는 예매 (null이면 닫혀 있음), 회원 탈퇴 확인 팝업 열림 여부
    const [cancelTarget, setCancelTarget] = useState<BookingRecord | null>(null);
    const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);

    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // 로그인한 계정이 바뀌면(다른 탭에서 계정 전환 등) 열려 있던 수정 폼을 닫고 입력값을 비움
    const userId = user?.id;
    useEffect(() => {
        setIsEditing(false);
        setCurrentPassword('');
        setNewPassword('');
        setProfileMessage('');
    }, [userId]);

    // 수정 폼이 열리면 이름 입력창에 자동 포커스
    useEffect(() => {
        if (isEditing) {
            nameInputRef.current?.focus();
        }
    }, [isEditing]);

    // 내 예매 내역 / 주문 내역만 골라서 최신순으로 정렬
    const myOwnBookings = useMemo(
        () =>
            user
                ? myBookings
                      .filter(booking => booking.userId === user.id)
                      .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
                : [],
        [myBookings, user]
    );

    const myOwnOrders = useMemo(
        () =>
            user
                ? foodOrders
                      .filter(order => order.userId === user.id)
                      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
                : [],
        [foodOrders, user]
    );

    // ── 내 정보 수정 ──
    // '정보 수정' 버튼: 현재 이름을 채운 수정 폼을 연다
    const handleStartEdit = () => {
        if (!user) return;
        setName(user.name);
        setCurrentPassword('');
        setNewPassword('');
        setProfileMessage('');
        setIsEditing(true);
    };

    // '취소' 버튼: 입력하던 내용을 버리고 폼을 닫는다
    const handleCancelEdit = () => {
        setIsEditing(false);
        setCurrentPassword('');
        setNewPassword('');
        setProfileMessage('');
    };

    const handleProfileSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 성공하면 null, 실패하면 에러 메시지를 돌려받음 (실패하면 폼을 열어 둔 채 메시지 표시)
        const errorMessage = updateProfile(name, currentPassword, newPassword);
        if (errorMessage) {
            setProfileMessage(errorMessage);
            return;
        }

        // 성공하면 폼을 닫고, 바뀐 정보 아래에 완료 메시지 표시
        setCurrentPassword('');
        setNewPassword('');
        setIsEditing(false);
        setProfileMessage('정보가 수정되었습니다.');
    };

    // ── 예매 취소: 확인 팝업에서 동의하면 예매 내역 삭제 + 좌석 복구 ──
    const handleConfirmCancelBooking = () => {
        if (!cancelTarget) return;

        const booking = cancelTarget;
        setCancelTarget(null);
        setMyBookings(prev => prev.filter(b => b.bookingId !== booking.bookingId));
        setSchedules(prev => releaseSeats(prev, [booking]));
    };

    // ── 회원 탈퇴: 확인 팝업에서 동의하면 예매/주문 내역 삭제 + 좌석 복구 + 회원 정보 삭제 ──
    const handleWithdraw = () => {
        if (!user) return;
        setIsWithdrawConfirmOpen(false);

        setSchedules(prev => releaseSeats(prev, myOwnBookings));
        setMyBookings(prev => prev.filter(b => b.userId !== user.id));
        setFoodOrders(prev => prev.filter(o => o.userId !== user.id));

        // 회원 목록에서 삭제하고 로그아웃 (AuthContext)
        withdraw();
        navigate('/');
    };

    // ── 미로그인 화면 ──
    if (!user) {
        return (
            <div className="my-page">
                <p className="status-message">마이페이지는 로그인 후 이용할 수 있습니다.</p>
                <button type="button" onClick={() => setIsLoginOpen(true)}>
                    로그인
                </button>
                <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            </div>
        );
    }

    return (
        <div className="my-page">
            <h2>마이페이지</h2>

            {/* 내 정보 (수정 버튼을 누르면 수정 폼이 나타남) */}
            <section className="my-section">
                <div className="my-section-header">
                    <h3>내 정보</h3>
                    {!isEditing && (
                        <button type="button" className="profile-edit-btn" onClick={handleStartEdit}>
                            정보 수정
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <>
                        <p>아이디: {user.id} (아이디는 변경할 수 없어요)</p>

                        <form onSubmit={handleProfileSave}>
                            <input
                                ref={nameInputRef}
                                type="text"
                                placeholder="이름"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="현재 비밀번호 (비밀번호 변경 시에만 입력)"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="새 비밀번호 (변경하지 않으려면 비워두세요)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                            {profileMessage && <p className="my-message">{profileMessage}</p>}
                            <div className="profile-form-buttons">
                                <button type="submit">저장</button>
                                <button
                                    type="button"
                                    className="profile-cancel-btn"
                                    onClick={handleCancelEdit}
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <dl className="profile-summary">
                            <div>
                                <dt>아이디</dt>
                                <dd>{user.id}</dd>
                            </div>
                            <div>
                                <dt>이름</dt>
                                <dd>{user.name}</dd>
                            </div>
                        </dl>
                        {profileMessage && <p className="my-message">{profileMessage}</p>}
                    </>
                )}
            </section>

            {/* 내 예매 내역 */}
            <section className="my-section">
                <h3>내 예매 내역 ({myOwnBookings.length})</h3>

                {myOwnBookings.length === 0 ? (
                    <p>예매 내역이 없습니다.</p>
                ) : (
                    <ul className="booking-list">
                        {myOwnBookings.map(booking => {
                            const posterUrl = getImageUrl(booking.posterPath, 'w185');
                            const isPast = isPastSchedule(booking.scheduleDate, booking.scheduleTime);

                            return (
                                <li key={booking.bookingId} className="booking-item">
                                    {/* 누르면 티켓 모양으로 보여줌 */}
                                    <button
                                        type="button"
                                        className="booking-item-main"
                                        onClick={() => setTicketBooking(booking)}
                                        aria-label={`${booking.movieTitle} 티켓 보기`}
                                    >
                                        {posterUrl && (
                                            <img src={posterUrl} alt={`${booking.movieTitle} 포스터`} />
                                        )}
                                        <span className="booking-item-info">
                                            <span className="booking-item-title">{booking.movieTitle}</span>
                                            <span className="booking-item-line">
                                                일시: {booking.scheduleDate} {booking.scheduleTime}
                                            </span>
                                            <span className="booking-item-line">
                                                인원: 성인 {booking.headCount.adult}명, 청소년{' '}
                                                {booking.headCount.youth}명
                                            </span>
                                            <span className="booking-item-line">
                                                좌석: {booking.selectedSeats.join(', ')}
                                            </span>
                                            <span className="booking-item-line">
                                                결제 금액: {booking.totalPrice.toLocaleString()}원
                                            </span>
                                            <span className="booking-item-hint">티켓 보기 ›</span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="booking-cancel-btn"
                                        onClick={() => setCancelTarget(booking)}
                                        disabled={isPast}
                                    >
                                        {isPast ? '상영 종료' : '예매 취소'}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* 매점 주문 내역 */}
            <section className="my-section">
                <h3>매점 주문 내역 ({myOwnOrders.length})</h3>

                {myOwnOrders.length === 0 ? (
                    <p>주문 내역이 없습니다.</p>
                ) : (
                    <ul className="order-list">
                        {myOwnOrders.map(order => (
                            <li key={order.orderId} className="order-item">
                                <p>{new Date(order.orderedAt).toLocaleString('ko-KR')}</p>
                                <p>
                                    {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                                </p>
                                <p>결제 금액: {order.totalPrice.toLocaleString()}원</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* 회원 탈퇴 */}
            <section className="my-section">
                <h3>회원 탈퇴</h3>
                <button type="button" className="danger-btn" onClick={() => setIsWithdrawConfirmOpen(true)}>
                    회원 탈퇴
                </button>
            </section>

            {/* 예매 티켓 */}
            <TicketModal booking={ticketBooking} onClose={() => setTicketBooking(null)} />

            {/* 예매 취소 확인 팝업 */}
            <ConfirmModal
                isOpen={cancelTarget !== null}
                variant="danger"
                title="예매를 취소할까요?"
                message="취소하면 선택했던 좌석이 반환되고, 되돌릴 수 없어요."
                detail={
                    cancelTarget
                        ? `${cancelTarget.movieTitle} · ${cancelTarget.scheduleDate} ${cancelTarget.scheduleTime} · ${cancelTarget.selectedSeats.join(', ')}`
                        : ''
                }
                confirmText="예매 취소"
                cancelText="돌아가기"
                onConfirm={handleConfirmCancelBooking}
                onCancel={() => setCancelTarget(null)}
            />

            {/* 회원 탈퇴 확인 팝업 */}
            <ConfirmModal
                isOpen={isWithdrawConfirmOpen}
                variant="danger"
                title="정말 탈퇴할까요?"
                message="예매 내역과 매점 주문 내역이 모두 삭제되고, 예매한 좌석은 반환돼요. 되돌릴 수 없어요."
                confirmText="회원 탈퇴"
                onConfirm={handleWithdraw}
                onCancel={() => setIsWithdrawConfirmOpen(false)}
            />
        </div>
    );
};

export default MyPage;