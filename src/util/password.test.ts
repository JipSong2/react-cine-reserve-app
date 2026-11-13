// src/util/password.test.ts
// 비밀번호 암호화/검증과 길이 제한(bcrypt 72바이트)이 맞게 동작하는지 검사
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isPasswordTooLong } from './password';

describe('isPasswordTooLong', () => {
    it('영문·숫자는 72자까지 허용하고 73자부터 거부한다', () => {
        expect(isPasswordTooLong('a'.repeat(72))).toBe(false);
        expect(isPasswordTooLong('a'.repeat(73))).toBe(true);
    });

    it('한글은 글자당 3바이트라 24자까지 허용하고 25자부터 거부한다', () => {
        expect(isPasswordTooLong('가'.repeat(24))).toBe(false);
        expect(isPasswordTooLong('가'.repeat(25))).toBe(true);
    });
});

describe('hashPassword / verifyPassword', () => {
    it('암호화한 값은 원래 비밀번호와 다르고, 올바른 비밀번호로 검증된다', () => {
        const hash = hashPassword('pass1234');
        expect(hash).not.toBe('pass1234');
        expect(hash.startsWith('$2')).toBe(true); // bcrypt 형식
        expect(verifyPassword('pass1234', hash)).toBe(true);
    });

    it('틀린 비밀번호는 거부한다', () => {
        const hash = hashPassword('pass1234');
        expect(verifyPassword('pass12345', hash)).toBe(false);
        expect(verifyPassword('', hash)).toBe(false);
    });

    it('같은 비밀번호라도 매번 다른 값으로 암호화된다 (무작위 salt)', () => {
        expect(hashPassword('pass1234')).not.toBe(hashPassword('pass1234'));
    });

    it('너무 긴 비밀번호는 앞부분이 같아도 통과시키지 않는다', () => {
        const base = 'a'.repeat(72);
        const hash = hashPassword(base);
        expect(verifyPassword(base, hash)).toBe(true);
        expect(verifyPassword(base + 'b', hash)).toBe(false);
    });
});