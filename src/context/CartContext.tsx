// src/context/CartContext.tsx
// 주요 기능: 매점 장바구니 상태를 앱 전역에서 유지 (페이지를 이동했다 돌아와도, 새로고침해도 장바구니가 남음)
// 적용 개념: useContext, createContext, useReducer (cartReducer), useEffect
// 상호작용 연계: main.tsx에서 <CartProvider>로 App을 감싸고, FoodStorePage.tsx에서 useCart()로 사용.
//
// 저장소로 sessionStorage를 사용하는 이유:
//   - 브라우저 탭마다 장바구니가 독립적이라, 여러 탭이 서로의 장바구니를 덮어쓰는 문제가 없음
//   - 탭을 닫으면 자동으로 비워져서 '오래된 장바구니'가 남지 않음

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { cartReducer, initialCart } from '../reducers/cartReducer';
import type { CartAction, CartItem } from '../types';

const CART_KEY = 'cine_cart';

// 저장된 장바구니 불러오기 (없거나 깨져 있으면 빈 장바구니)
const loadCart = (): CartItem[] => {
    try {
        const raw = sessionStorage.getItem(CART_KEY);
        if (!raw) return initialCart;

        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CartItem[]) : initialCart;
    } catch (error) {
        console.error('장바구니를 불러오지 못했습니다.', error);
        return initialCart;
    }
};

interface CartContextType {
    cart: CartItem[];
    dispatch: Dispatch<CartAction>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    // 세 번째 인자(초기화 함수)로 첫 렌더링 때만 저장된 값을 읽어옴
    const [cart, dispatch] = useReducer(cartReducer, initialCart, loadCart);

    // 장바구니가 바뀔 때마다 저장
    useEffect(() => {
        try {
            sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (error) {
            console.error('장바구니 저장 실패', error);
        }
    }, [cart]);

    const value = useMemo(() => ({ cart, dispatch }), [cart]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};