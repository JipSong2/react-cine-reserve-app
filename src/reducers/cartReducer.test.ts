// src/reducers/cartReducer.test.ts
// cartReducer(장바구니 상태 변경 규칙)가 의도대로 동작하는지 검사
import { describe, it, expect } from 'vitest';
import { cartReducer, initialCart } from './cartReducer';
import type { CartItem, FoodItem } from '../types';

const cola: FoodItem = { id: 'drink-cola', name: '콜라', category: 'drink', price: 3500, imageUrl: '' };
const popcorn: FoodItem = { id: 'popcorn-original', name: '오리지널 팝콘', category: 'popcorn', price: 6000, imageUrl: '' };

describe('cartReducer', () => {
    it('새 메뉴를 담으면 수량 1로 추가된다', () => {
        const next = cartReducer(initialCart, { type: 'ADD_ITEM', payload: cola });
        expect(next).toEqual([{ food: cola, quantity: 1 }]);
    });

    it('이미 담긴 메뉴를 또 담으면 항목이 늘지 않고 수량만 늘어난다', () => {
        const once = cartReducer(initialCart, { type: 'ADD_ITEM', payload: cola });
        const twice = cartReducer(once, { type: 'ADD_ITEM', payload: cola });
        expect(twice).toHaveLength(1);
        expect(twice[0].quantity).toBe(2);
    });

    it('다른 메뉴를 담으면 별도 항목으로 추가된다', () => {
        const a = cartReducer(initialCart, { type: 'ADD_ITEM', payload: cola });
        const b = cartReducer(a, { type: 'ADD_ITEM', payload: popcorn });
        expect(b.map(item => item.food.id)).toEqual(['drink-cola', 'popcorn-original']);
    });

    it('UPDATE_QUANTITY: 수량을 원하는 값으로 바꾼다', () => {
        const once = cartReducer(initialCart, { type: 'ADD_ITEM', payload: cola });
        const next = cartReducer(once, { type: 'UPDATE_QUANTITY', payload: { foodId: cola.id, quantity: 5 } });
        expect(next[0].quantity).toBe(5);
    });

    it('UPDATE_QUANTITY: 수량이 0 이하가 되면 장바구니에서 제거된다', () => {
        const once = cartReducer(initialCart, { type: 'ADD_ITEM', payload: cola });
        expect(cartReducer(once, { type: 'UPDATE_QUANTITY', payload: { foodId: cola.id, quantity: 0 } })).toEqual([]);
        expect(cartReducer(once, { type: 'UPDATE_QUANTITY', payload: { foodId: cola.id, quantity: -1 } })).toEqual([]);
    });

    it('REMOVE_ITEM: 해당 메뉴만 삭제한다', () => {
        const state: CartItem[] = [
            { food: cola, quantity: 2 },
            { food: popcorn, quantity: 1 },
        ];
        const next = cartReducer(state, { type: 'REMOVE_ITEM', payload: cola.id });
        expect(next).toEqual([{ food: popcorn, quantity: 1 }]);
    });

    it('CLEAR_CART: 전부 비운다', () => {
        const state: CartItem[] = [{ food: cola, quantity: 2 }];
        expect(cartReducer(state, { type: 'CLEAR_CART' })).toEqual([]);
    });

    it('기존 state를 직접 수정하지 않는다 (순수 함수)', () => {
        const state: CartItem[] = [{ food: cola, quantity: 1 }];
        const snapshot = JSON.parse(JSON.stringify(state));
        cartReducer(state, { type: 'ADD_ITEM', payload: cola });
        cartReducer(state, { type: 'UPDATE_QUANTITY', payload: { foodId: cola.id, quantity: 9 } });
        expect(state).toEqual(snapshot);
    });
});