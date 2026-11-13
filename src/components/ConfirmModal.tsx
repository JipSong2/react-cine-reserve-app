// src/components/ConfirmModal.tsx
// 주요 기능: '정말 할까요?' 하고 한 번 더 묻는 공통 확인 팝업 (브라우저 기본 confirm 창 대신 사용)
//           - 기본(sky): 로그아웃처럼 가벼운 확인 / 위험(danger): 되돌릴 수 없는 예매 취소, 회원 탈퇴
// 적용 개념: Props 전달, useRef (모달이 열릴 때 버튼에 자동 focus()), useEffect (ESC 키 처리), 조건부 스타일링
// 상호작용 연계: Header.tsx(로그아웃), MyPage.tsx(예매 취소, 회원 탈퇴)에서 사용.
//               동의(onConfirm)/취소(onCancel)만 알려주고, 실제 동작은 부모가 담당.

import { useRef, useEffect } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string; // 무엇에 대한 확인인지 보여주는 한 줄 (예: 취소할 예매 정보)
    confirmText?: string; // 동의 버튼 글자 (기본: 확인)
    cancelText?: string; // 취소 버튼 글자 (기본: 취소)
    variant?: 'default' | 'danger'; // danger: 빨간색으로 표시 (되돌릴 수 없는 동작)
    onConfirm: () => void;
    onCancel: () => void; // 취소 버튼, ESC 키, 배경 클릭 시 호출
}

// 사용 예시 (Header에서)
// <ConfirmModal
//     isOpen={isLogoutConfirmOpen}
//     title="로그아웃 할까요?"
//     message="다시 로그인하면 예매 내역을 계속 확인할 수 있어요."
//     confirmText="로그아웃"
//     onConfirm={handleLogout}
//     onCancel={() => setIsLogoutConfirmOpen(false)}
// />
const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    detail,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'default',
    onConfirm,
    onCancel,
}) => {
    const isDanger = variant === 'danger';

    // 팝업이 열릴 때 버튼에 자동 포커스 (Enter로 바로 선택 가능)
    // 위험한 동작은 실수로 Enter를 눌러도 실행되지 않도록 '취소' 버튼에 포커스
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        if (isDanger) {
            cancelButtonRef.current?.focus();
        } else {
            confirmButtonRef.current?.focus();
        }
    }, [isOpen, isDanger]);

    // ESC 키는 '취소'로 처리
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    // 닫혀 있으면 아무것도 렌더링하지 않음
    if (!isOpen) return null;

    return (
        // 어두운 배경 클릭은 '취소'로 처리
        <div className="modal-overlay" onClick={onCancel}>
            {/* 팝업 내부 클릭은 배경 클릭으로 전달되지 않도록 막음 */}
            <div
                className={isDanger ? 'modal-content confirm-modal confirm-danger' : 'modal-content confirm-modal'}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                onClick={e => e.stopPropagation()}
            >
                <div className="confirm-icon" aria-hidden="true">
                    {isDanger ? '!' : '?'}
                </div>

                <h2 id="confirm-title">{title}</h2>
                <p id="confirm-message" className="confirm-message">
                    {message}
                </p>
                {detail && <p className="confirm-detail">{detail}</p>}

                <div className="confirm-buttons">
                    <button ref={cancelButtonRef} type="button" className="confirm-cancel" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button ref={confirmButtonRef} type="button" className="confirm-ok" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;