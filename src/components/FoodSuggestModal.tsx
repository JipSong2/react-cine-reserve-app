// src/components/FoodSuggestModal.tsx
// 주요 기능: 예매 완료 후 '매점에서 팝콘/음료도 준비할까요?' 하고 권유하는 팝업. 동의/사양 선택을 부모에게 전달.
// 적용 개념: Props 전달, useRef (모달이 열릴 때 '매점으로 이동' 버튼에 자동 focus()), useEffect (ESC 키 처리)
// 상호작용 연계: BookingPage.tsx에서 결제가 끝나면 띄움.
//               동의(onAccept) -> /food(FoodStorePage), 사양(onDecline) -> /mypage로 이동 (이동 처리는 부모가 담당).

import { useRef, useEffect } from 'react';

interface FoodSuggestModalProps {
    isOpen: boolean;
    movieTitle: string;
    headCount: number; // 예매한 총 인원
    onAccept: () => void; // '매점으로 이동' 클릭 시 호출
    onDecline: () => void; // '괜찮아요' 클릭 또는 ESC 키 입력 시 호출
}

const FoodSuggestModal: React.FC<FoodSuggestModalProps> = ({
    isOpen,
    movieTitle,
    headCount,
    onAccept,
    onDecline,
}) => {
    // 모달이 열릴 때 '매점으로 이동' 버튼에 자동 포커스 (Enter로 바로 선택 가능)
    const acceptButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            acceptButtonRef.current?.focus();
        }
    }, [isOpen]);

    // ESC 키는 '사양'으로 처리 (예매는 이미 끝났으므로 예매 내역으로 이동)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDecline();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onDecline]);

    // 닫혀 있으면 아무것도 렌더링하지 않음
    if (!isOpen) return null;

    // 배경을 눌러도 닫히지 않음: 두 버튼 중 하나를 직접 고르게 함
    return (
        <div className="modal-overlay">
            <div
                className="modal-content suggest-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="suggest-title"
            >
                <h2 id="suggest-title">예매가 완료되었어요 🎉</h2>

                <p className="suggest-summary">
                    '{movieTitle}' · {headCount}명
                </p>
                <p className="suggest-text">
                    영화와 함께 즐길 팝콘과 음료도 준비해 둘까요?
                    <br />
                    미리 주문해 두면 상영 전에 줄 설 필요가 없어요.
                </p>

                <div className="suggest-buttons">
                    <button
                        ref={acceptButtonRef}
                        type="button"
                        className="suggest-accept"
                        onClick={onAccept}
                    >
                        매점으로 이동
                    </button>
                    <button type="button" className="suggest-decline" onClick={onDecline}>
                        괜찮아요, 예매 내역 보기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FoodSuggestModal;