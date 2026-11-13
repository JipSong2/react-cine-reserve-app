// src/util/password.ts
// 주요 기능: 비밀번호를 bcrypt로 암호화(해시)하고, 입력한 비밀번호가 맞는지 비교하는 유틸
//           - 같은 비밀번호라도 매번 다른 값이 만들어지고(무작위 salt), 암호화한 값으로는 원래 비밀번호를 알아낼 수 없음
// 상호작용 연계: context/AuthContext.tsx(회원가입, 로그인, 정보 수정)에서만 사용.
//
// 설치: npm install bcryptjs

import bcrypt from 'bcryptjs';

// 값이 클수록 안전하지만 느려짐 (10이면 한 번에 0.1초 안팎)
const SALT_ROUNDS = 10;

// bcrypt는 72바이트(영문 72자, 한글은 글자당 3바이트라 24자)까지만 비교하고 나머지는 무시함
// → 너무 긴 비밀번호는 아예 받지 않아서, 앞부분만 같은 다른 비밀번호가 통과하는 일을 막음
const MAX_PASSWORD_BYTES = 72;

export const PASSWORD_TOO_LONG_MESSAGE = '비밀번호가 너무 길어요. (영문·숫자는 72자, 한글은 24자까지)';

export const isPasswordTooLong = (password: string): boolean =>
    new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES;

// 비밀번호 -> 암호화한 값 (예: $2b$10$...)
export const hashPassword = (password: string): string => bcrypt.hashSync(password, SALT_ROUNDS);

// 입력한 비밀번호가 저장된 암호화 값과 맞는지 확인
export const verifyPassword = (password: string, hash: string): boolean =>
    !isPasswordTooLong(password) && bcrypt.compareSync(password, hash);