// src/components/Header.tsx
// 주요 기능: 상단 네비게이션 바 (로고, 영화 목록, 매점 메뉴, 마이페이지 이동 링크, 로그인/로그아웃 버튼)
// 적용 개념: useContext (AuthContext, CartContext), react-router-dom (Link, useNavigate, useLocation)
// 상호작용 연계: App.tsx 최상단에 배치되어 상시 노출됨.
//               로그인 여부에 따라 '로그인' 버튼 또는 'OO님 환영합니다 / 로그아웃' 버튼으로 전환.
//               현재 보고 있는 화면에 해당하는 메뉴는 강조해서 표시함.
//               로그아웃은 확인 팝업(ConfirmModal)에서 동의했을 때만 진행하며, 이때 장바구니도 함께 비움.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoginModal from './LoginModal';
import ConfirmModal from './ConfirmModal';

const Header: React.FC = () => {
    // AuthContext의 useContext를 감싼 커스텀 훅 (useAuth)
    const { user, logout } = useAuth();
    const { dispatch } = useCart();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // 로그인 모달 열림/닫힘 상태
    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
    // 로그아웃 확인 팝업 열림/닫힘 상태
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);

    // 확인 팝업에서 '로그아웃'을 눌렀을 때만 실제로 로그아웃 (실수로 누르는 것을 막기 위해 한 번 더 확인)
    const handleLogout = () => {
        setIsLogoutConfirmOpen(false);
        logout();
        dispatch({ type: 'CLEAR_CART' }); // 다음에 로그인하는 계정에 장바구니가 넘어가지 않도록 비움
        navigate('/'); // 로그아웃 후 메인 화면으로 이동
    };

    // 현재 주소에 해당하는 메뉴를 강조 (영화 상세/예매 화면도 '영화 목록' 메뉴에 속함)
    const isMovieMenu =
        pathname === '/' || pathname.startsWith('/movie/') || pathname.startsWith('/booking/');
    const isFoodMenu = pathname.startsWith('/food');
    const isMyPageMenu = pathname.startsWith('/mypage');

    return (
        <>
            <header className="header">
                <Link to="/" className="header-logo">
                    🎬 CINE RESERVE
                </Link>

                <nav className="header-nav">
                    <Link
                        to="/"
                        className={isMovieMenu ? 'active' : undefined}
                        aria-current={isMovieMenu ? 'page' : undefined}
                    >
                        영화 목록
                    </Link>
                    <Link
                        to="/food"
                        className={isFoodMenu ? 'active' : undefined}
                        aria-current={isFoodMenu ? 'page' : undefined}
                    >
                        매점
                    </Link>
                    {/* 마이페이지는 로그인한 사용자에게만 노출 */}
                    {user && (
                        <Link
                            to="/mypage"
                            className={isMyPageMenu ? 'active' : undefined}
                            aria-current={isMyPageMenu ? 'page' : undefined}
                        >
                            마이페이지
                        </Link>
                    )}
                </nav>

                <div className="header-auth">
                    {user ? (
                        <>
                            <span className="header-welcome">{user.name}님 환영합니다</span>
                            <button type="button" onClick={() => setIsLogoutConfirmOpen(true)}>
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setIsLoginOpen(true)}>
                            로그인
                        </button>
                    )}
                </div>
            </header>

            {/* 로그인 모달: isOpen이 true일 때만 화면에 표시 */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            {/* 로그아웃 확인 팝업 */}
            <ConfirmModal
                isOpen={isLogoutConfirmOpen}
                title="로그아웃 할까요?"
                message="다시 로그인하면 예매 내역을 계속 확인할 수 있어요."
                confirmText="로그아웃"
                onConfirm={handleLogout}
                onCancel={() => setIsLogoutConfirmOpen(false)}
            />
        </>
    );
};

export default Header;