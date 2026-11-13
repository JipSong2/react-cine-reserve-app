// src/context/AuthContext.tsx
// 주요 기능: 현재 로그인 유저 정보(user), 회원가입/로그인/로그아웃, 회원 정보 수정 및 탈퇴 전역 상태 관리.
//           가입 회원 목록('cine_users')도 이곳에서만 관리해서, 여러 컴포넌트가 각자 복사본을 들고
//           서로 어긋나는 문제를 막음.
//           비밀번호는 원문 그대로 저장하지 않고 bcrypt로 암호화(해시)해서 저장하고 비교함. (util/password.ts)
// 적용 개념: useContext, createContext, useState, useEffect (+ useCallback, useMemo, useLocalStorage)
// 상호작용 연계: main.tsx에서 전체 앱을 <AuthProvider>로 감싸줌.
//               Header.tsx, LoginModal.tsx, MyPage.tsx, BookingPage.tsx, FoodStorePage.tsx에서 사용.

import { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { hashPassword, verifyPassword, isPasswordTooLong, PASSWORD_TOO_LONG_MESSAGE } from '../util/password';
import type { User, StoredUser } from '../types';

const CURRENT_USER_KEY = 'cine_current_user'; // 현재 로그인 유저 (id, name)
const USERS_KEY = 'cine_users';               // 가입 회원 목록 (id, name, passwordHash)

// 동작 결과: 성공이면 null, 실패면 화면에 보여줄 에러 메시지
type AuthResult = string | null;

interface AuthContextType {
    user: User | null; // 현재 로그인한 유저 (비밀번호는 포함하지 않음)
    signup: (id: string, name: string, password: string) => AuthResult;
    login: (id: string, password: string) => AuthResult;
    logout: () => void;
    updateProfile: (name: string, currentPassword: string, newPassword: string) => AuthResult;
    withdraw: () => void; // 회원 목록에서 삭제하고 로그아웃 (예매/주문 내역 정리는 호출하는 쪽에서)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // useLocalStorage의 지연 초기화 덕분에 첫 렌더링부터 로그인 상태가 복원됨
    const [user, setUser] = useLocalStorage<User | null>(CURRENT_USER_KEY, null);
    const [users, setUsers] = useLocalStorage<StoredUser[]>(USERS_KEY, []);

    // 다른 탭의 로그인/로그아웃/회원 정보 변경은 useLocalStorage가 자동으로 동기화해줌

    // 예전에 평문으로 저장된 비밀번호가 있으면 암호화(해시)해서 다시 저장 (이후에는 원문이 남지 않음)
    useEffect(() => {
        if (!users.some(u => u.password !== undefined)) return;

        setUsers(prev =>
            prev.map(u => {
                if (u.password === undefined) return u;
                const { password, ...rest } = u;
                return { ...rest, passwordHash: hashPassword(password) };
            })
        );
    }, [users, setUsers]);

    // 회원가입: 아이디 중복만 확인 (입력 형식 검사는 LoginModal에서 함). 가입 후 바로 로그인 처리
    const signup = useCallback(
        (id: string, name: string, password: string): AuthResult => {
            if (isPasswordTooLong(password)) {
                return PASSWORD_TOO_LONG_MESSAGE;
            }
            if (users.some(u => u.id === id)) {
                return '이미 사용 중인 아이디입니다.';
            }
            // 원래 비밀번호는 저장하지 않고, 암호화한 값(passwordHash)만 저장
            setUsers(prev => [...prev, { id, name, passwordHash: hashPassword(password) }]);
            setUser({ id, name });
            return null;
        },
        [users, setUsers, setUser]
    );

    // 로그인: 입력한 비밀번호를 암호화 값과 비교 (원래 비밀번호는 알 수 없으므로 verifyPassword로 확인)
    const login = useCallback(
        (id: string, password: string): AuthResult => {
            const foundUser = users.find(u => u.id === id);
            if (!foundUser || !foundUser.passwordHash || !verifyPassword(password, foundUser.passwordHash)) {
                return '아이디 또는 비밀번호가 올바르지 않습니다.';
            }
            setUser({ id: foundUser.id, name: foundUser.name });
            return null;
        },
        [users, setUser]
    );

    const logout = useCallback(() => {
        setUser(null);
    }, [setUser]);

    // 회원 정보 수정: 이름은 항상 변경, 비밀번호는 새 비밀번호를 입력했을 때만 현재 비밀번호 확인 후 변경 (암호화해서 저장)
    const updateProfile = useCallback(
        (name: string, currentPassword: string, newPassword: string): AuthResult => {
            if (!user) return '로그인이 필요합니다.';

            const trimmedName = name.trim();
            if (trimmedName.length === 0) return '이름을 입력해주세요.';

            const storedUser = users.find(u => u.id === user.id);
            if (!storedUser) return '회원 정보를 찾을 수 없습니다. 다시 로그인해주세요.';

            let nextPasswordHash = storedUser.passwordHash;
            if (newPassword.length > 0) {
                if (
                    !storedUser.passwordHash ||
                    !verifyPassword(currentPassword, storedUser.passwordHash)
                ) {
                    return '현재 비밀번호가 올바르지 않습니다.';
                }
                if (newPassword.length < 4) {
                    return '새 비밀번호는 4자 이상 입력해주세요.';
                }
                if (isPasswordTooLong(newPassword)) {
                    return PASSWORD_TOO_LONG_MESSAGE;
                }
                nextPasswordHash = hashPassword(newPassword);
            }

            setUsers(prev =>
                prev.map(u =>
                    u.id === user.id ? { ...u, name: trimmedName, passwordHash: nextPasswordHash } : u
                )
            );
            setUser({ id: user.id, name: trimmedName });
            return null;
        },
        [user, users, setUsers, setUser]
    );

    // 회원 탈퇴: 회원 목록에서 삭제하고 로그아웃
    const withdraw = useCallback(() => {
        if (!user) return;
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setUser(null);
    }, [user, setUsers, setUser]);

    // value 객체를 캐싱해서, 값이 바뀔 때만 구독 중인 컴포넌트가 다시 렌더링되도록 함
    const value = useMemo(
        () => ({ user, signup, login, logout, updateProfile, withdraw }),
        [user, signup, login, logout, updateProfile, withdraw]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};