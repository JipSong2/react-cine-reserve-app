// src/components/LoginModal.tsx
// 주요 기능: 로그인/회원가입 팝업 모달창, 폼 입력 유효성 검사, 로그인 성공 처리, 회원가입 성공 시 완료 안내
// 적용 개념: useRef (모달을 띄울 때 아이디 입력창에 자동 focus()), useState, useContext,
//           접근성(role="dialog", aria 속성, 포커스 가두기: useFocusTrap)
// 상호작용 연계: Header.tsx나 미로그인 상태에서 예매 시 BookingPage.tsx에서 팝업으로 띄움.
//               성공 시 AuthContext 상태를 갱신함.

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Mode = 'login' | 'signup';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    // 회원 목록 확인/등록은 AuthContext가 담당 (성공하면 null, 실패하면 에러 메시지 반환)
    const { login, signup } = useAuth();

    const [mode, setMode] = useState<Mode>('login');
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    // 회원가입에 성공하면 가입한 이름이 들어가고, 입력 폼 대신 완료 안내를 보여줌
    const [signedUpName, setSignedUpName] = useState<string | null>(null);

    // 모달이 열릴 때 아이디 입력창에 자동 포커스
    const idInputRef = useRef<HTMLInputElement>(null);
    // 회원가입 완료 안내가 나타나면 '확인' 버튼에 자동 포커스
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    // 현재 보이는 팝업(로그인 폼 또는 가입 완료 안내) 요소: Tab 키 포커스를 이 안에 가둠
    const dialogRef = useRef<HTMLDivElement>(null);

    // ※ 아래의 자동 focus() effect보다 먼저 호출해야 '열기 전에 포커스가 있던 요소'를 기억할 수 있음
    useFocusTrap(isOpen, dialogRef);

    useEffect(() => {
        if (isOpen) {
            // 열릴 때마다 입력값 초기화
            setMode('login');
            setId('');
            setName('');
            setPassword('');
            setErrorMessage('');
            setSignedUpName(null);
            idInputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (signedUpName) {
            confirmButtonRef.current?.focus();
        }
    }, [signedUpName]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 로그인 <-> 회원가입 전환
    const switchMode = (nextMode: Mode) => {
        setMode(nextMode);
        setErrorMessage('');
        idInputRef.current?.focus();
    };

    // 입력값 유효성 검사 (통과하면 null, 실패하면 에러 메시지 반환)
    const validate = (): string | null => {
        if (id.trim().length < 4) return '아이디는 4자 이상 입력해주세요.';
        if (password.length < 4) return '비밀번호는 4자 이상 입력해주세요.';
        if (mode === 'signup' && name.trim().length === 0) return '이름을 입력해주세요.';
        return null;
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationError = validate();
        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        const trimmedId = id.trim();

        // 회원가입(가입 후 바로 로그인 처리) 또는 로그인
        const authError =
            mode === 'signup'
                ? signup(trimmedId, name.trim(), password)
                : login(trimmedId, password);

        if (authError) {
            setErrorMessage(authError);
            return;
        }

        // 회원가입 성공: 바로 닫지 않고 완료 안내를 먼저 보여줌 (가입 후 자동으로 로그인된 상태)
        if (mode === 'signup') {
            setSignedUpName(name.trim());
            return;
        }

        onClose();
    };

    // 닫혀 있으면 아무것도 렌더링하지 않음
    if (!isOpen) return null;

    // 회원가입 완료 안내
    if (signedUpName) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div
                    ref={dialogRef}
                    className="modal-content signup-done"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="signup-done-title"
                    onClick={e => e.stopPropagation()}
                >
                    <h2 id="signup-done-title">회원가입이 완료되었어요</h2>
                    <p>{signedUpName}님, 환영합니다! 가입과 함께 로그인되었어요.</p>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        className="signup-done-btn"
                        onClick={onClose}
                    >
                        확인
                    </button>
                </div>
            </div>
        );
    }

    return (
        // 어두운 배경 클릭 시 닫기
        <div className="modal-overlay" onClick={onClose}>
            {/* 모달 내부 클릭은 배경 클릭으로 전달되지 않도록 막음 */}
            <div
                ref={dialogRef}
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-modal-title"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="login-modal-title">{mode === 'login' ? '로그인' : '회원가입'}</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        ref={idInputRef}
                        type="text"
                        placeholder="아이디"
                        aria-label="아이디"
                        value={id}
                        onChange={e => setId(e.target.value)}
                    />

                    {mode === 'signup' && (
                        <input
                            type="text"
                            placeholder="이름"
                            aria-label="이름"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    )}

                    <input
                        type="password"
                        placeholder="비밀번호"
                        aria-label="비밀번호"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />

                    {errorMessage && (
                        // role="alert": 에러가 생기면 스크린 리더가 바로 읽어줌
                        <p className="modal-error" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    <button type="submit">
                        {mode === 'login' ? '로그인' : '가입하기'}
                    </button>
                </form>

                <div className="modal-footer">
                    {mode === 'login' ? (
                        <button type="button" onClick={() => switchMode('signup')}>
                            계정이 없으신가요? 회원가입
                        </button>
                    ) : (
                        <button type="button" onClick={() => switchMode('login')}>
                            이미 계정이 있으신가요? 로그인
                        </button>
                    )}
                    <button type="button" onClick={onClose}>
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;