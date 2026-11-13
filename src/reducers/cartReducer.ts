// src/reducers/cartReducer.ts
// 주요 기능: 식사 메뉴 장바구니의 추가(ADD_ITEM), 삭제(REMOVE_ITEM), 수량 조정(UPDATE_QUANTITY), 초기화(CLEAR_CART) 로직
// 적용 개념: useReducer (Reducer Pure Function)
// 상호작용 연계: context/CartContext.tsx에서 useReducer(cartReducer, initialCart, ...)로 호출되어 장바구니 상태를 관리함.
//               FoodStorePage.tsx, Header.tsx(로그아웃), MyPage.tsx(회원 탈퇴)는 useCart()로 dispatch를 사용.

import type { CartItem, CartAction } from '../types';

// 장바구니 초기 상태
export const initialCart: CartItem[] = [];

// 사용 예시
// (CartContext 안에서) const [cart, dispatch] = useReducer(cartReducer, initialCart, loadCart);
// (각 페이지에서)      const { cart, dispatch } = useCart();
// dispatch({ type: 'ADD_ITEM', payload: food });
// dispatch({ type: 'UPDATE_QUANTITY', payload: { foodId: food.id, quantity: 3 } });
export const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
    switch (action.type) {
        // 메뉴 추가: 이미 담긴 메뉴면 수량만 +1, 아니면 새로 추가
        case 'ADD_ITEM': {
            const existing = state.find(item => item.food.id === action.payload.id);

            if (existing) {
                return state.map(item =>
                    item.food.id === action.payload.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [...state, { food: action.payload, quantity: 1 }];
        }

        // 메뉴 삭제: payload는 음식 ID
        case 'REMOVE_ITEM':
            return state.filter(item => item.food.id !== action.payload);

        // 수량 변경: 0 이하가 되면 장바구니에서 제거
        case 'UPDATE_QUANTITY': {
            const { foodId, quantity } = action.payload;

            if (quantity <= 0) {
                return state.filter(item => item.food.id !== foodId);
            }

            return state.map(item =>
                item.food.id === foodId ? { ...item, quantity } : item
            );
        }

        // 장바구니 비우기
        case 'CLEAR_CART':
            return [];

        default:
            return state;
    }
};