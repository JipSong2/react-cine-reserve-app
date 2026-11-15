// src/hooks/useFocusTrap.ts
// 주요 기능: 모달이 열려 있는 동안 Tab 키로 포커스가 모달 밖(뒤쪽 화면)으로 나가지 않게 가두고,
//           모달이 닫히면 열기 전에 포커스가 있던 요소(예: 로그인 버튼)로 포커스를 돌려줌
// 적용 개념: Custom Hooks, useEffect, useRef (모달 요소 참조), 웹 접근성
// 상호작용 연계: LoginModal.tsx에서 사용. 다른 모달(ConfirmModal 등)에도 같은 방식으로 붙일 수 있음.

import { useEffect } from 'react';
import type { RefObject } from 'react';

// 키보드로 이동할 수 있는 요소들
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 사용 예시 (모달 컴포넌트에서)
// const dialogRef = useRef<HTMLDivElement>(null);
// useFocusTrap(isOpen, dialogRef);          // ※ 열릴 때 자동 focus()를 하는 useEffect보다 '먼저' 호출할 것
// <div ref={dialogRef} role="dialog" aria-modal="true"> ... </div>
//
// ※ 먼저 호출해야 하는 이유: 열기 전에 포커스가 있던 요소를 기억해야 하는데,
//   자동 focus() effect가 먼저 실행되면 이미 모달 안으로 포커스가 옮겨진 뒤라서 기억할 수 없음.
export function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (!isOpen) return;

        // 모달을 열기 직전에 포커스가 있던 요소 (닫을 때 되돌려 줌)
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const container = containerRef.current;
            if (!container) return;

            const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (!container.contains(active)) {
                // 포커스가 모달 밖에 있으면 모달 안으로 데려옴
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && active === first) {
                // 첫 요소에서 Shift+Tab -> 마지막 요소로
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                // 마지막 요소에서 Tab -> 첫 요소로
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen, containerRef]);
}