// src/pages/FoodStorePage.tsx (매점 & 식사 시스템)
// 주요 기능: 카테고리 탭(팝콘/스낵/음료), 메뉴 목록, 장바구니 수량 조절 및 총 금액 결제
// 적용 개념: useCart (CartContext 안의 useReducer + cartReducer), useMemo (장바구니 총 금액 연산)
// 상호작용 연계: FoodCard.tsx 컴포넌트 사용. 주문 결제 시 로컬스토리지에 내역 기록.
//               예매 완료 후 BookingPage에서 이동해 오면(navigate state) 안내 문구와 콤보 탭을 먼저 보여줌.

import { useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useCart } from '../context/CartContext';
import { createId } from '../util/id';
import FoodCard from '../components/FoodCard';
import LoginModal from '../components/LoginModal';
import type { FoodItem, FoodOrder, FoodRecommendState } from '../types';

// ─────────────────────────────────────────────
// 메뉴 데이터
// ─────────────────────────────────────────────
// 이미지 파일 없이도 보이도록 이모지로 SVG 이미지를 만들어 사용 (실제 이미지 주소로 교체 가능) (교체 완료)
/*
const emojiImage = (emoji: string): string =>
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
            `<rect width="100" height="100" fill="#f3f4f6"/>` +
            `<text x="50" y="68" font-size="56" text-anchor="middle">${emoji}</text>` +
            `</svg>`
    );
*/
const FOOD_MENU: FoodItem[] = [
    { id: 'popcorn-original', name: '오리지널 팝콘', category: 'popcorn', price: 6000, imageUrl: '/images/food/originalPopcorn.webp', description: '고소하고 바삭한 기본 팝콘' },
    { id: 'popcorn-caramel', name: '카라멜 팝콘', category: 'popcorn', price: 7000, imageUrl: '/images/food/caramelPopcorn.webp', description: '달콤한 카라멜 코팅 팝콘' },
    { id: 'snack-nacho', name: '나쵸', category: 'snack', price: 5500, imageUrl: '/images/food/nachos.webp', description: '치즈 소스를 곁들인 나쵸' },
    { id: 'snack-hotdog', name: '핫도그', category: 'snack', price: 5000, imageUrl: '/images/food/hotDog.webp', description: '갓 구운 소시지 핫도그' },
    { id: 'drink-cola', name: '콜라', category: 'drink', price: 3500, imageUrl: '/images/food/cola.webp', description: '시원한 탄산음료' },
    { id: 'drink-juice', name: '오렌지 주스', category: 'drink', price: 4000, imageUrl: '/images/food/juice.webp', description: '상큼한 오렌지 주스' },
    { id: 'combo-single', name: '싱글 콤보', category: 'combo', price: 8500, imageUrl: '/images/food/singleCombo.webp', description: '오리지널 팝콘 + 음료 1잔' },
    { id: 'combo-couple', name: '커플 콤보', category: 'combo', price: 13000, imageUrl: '/images/food/coupleCombo.webp', description: '카라멜 팝콘 + 음료 2잔' },
];

const LOGIN_REQUIRED_MESSAGE = '주문은 로그인 후 이용할 수 있습니다.';

type CategoryFilter = 'all' | FoodItem['category'];

// 예매 완료 후 이동해 왔을 때 함께 넘어온 정보 (주소창으로 직접 접속하면 없음)
const readRecommendState = (value: unknown): FoodRecommendState | null => {
    if (typeof value !== 'object' || value === null) return null;
    const { movieTitle, headCount } = value as Partial<FoodRecommendState>;
    return typeof movieTitle === 'string' && typeof headCount === 'number'
        ? { movieTitle, headCount }
        : null;
};

// 예매 인원에 맞는 콤보 추천 문구
const getRecommendText = (headCount: number): string => {
    const single = FOOD_MENU.find(food => food.id === 'combo-single');
    const couple = FOOD_MENU.find(food => food.id === 'combo-couple');

    if (headCount <= 1 && single) return `혼자 보신다면 ${single.name}(${single.description})를 추천해요.`;
    if (headCount === 2 && couple) return `두 분이라면 ${couple.name}(${couple.description})를 추천해요.`;
    return `${headCount}명이라면 콤보와 음료를 인원수에 맞춰 담아보세요.`;
};

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'popcorn', label: '팝콘' },
    { value: 'snack', label: '스낵' },
    { value: 'drink', label: '음료' },
    { value: 'combo', label: '콤보' },
];

const FoodStorePage: React.FC = () => {
    const { user } = useAuth();

    // 장바구니: CartContext (내부에서 useReducer + cartReducer 사용, 페이지를 이동해도 유지됨)
    const { cart, dispatch } = useCart();

    // 주문 내역 저장
    const [, setFoodOrders] = useLocalStorage<FoodOrder[]>('foodOrders', []);

    // 예매 완료 후 넘어왔다면 콤보 탭부터 보여줌
    const location = useLocation();
    const fromBooking = readRecommendState(location.state);

    const [category, setCategory] = useState<CategoryFilter>(fromBooking ? 'combo' : 'all');
    const [message, setMessage] = useState('');
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // 선택한 카테고리의 메뉴만 표시
    const filteredMenu = useMemo(
        () => (category === 'all' ? FOOD_MENU : FOOD_MENU.filter(food => food.category === category)),
        [category]
    );

    // 장바구니 총 금액 / 총 수량: 장바구니가 바뀔 때만 다시 계산
    const totalPrice = useMemo(
        () => cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0),
        [cart]
    );
    const totalCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    // FoodCard의 '장바구니 담기' -> ADD_ITEM 액션 (dispatch는 항상 같은 함수라 handleAdd도 매번 새로 만들어지지 않음)
    const handleAdd = useCallback((food: FoodItem) => {
        setMessage('');
        dispatch({ type: 'ADD_ITEM', payload: food });
    }, [dispatch]);

    // 주문 결제: 내역을 localStorage에 기록하고 장바구니 비우기
    const handleOrder = () => {
        if (cart.length === 0) {
            setMessage('장바구니가 비어 있습니다.');
            return;
        }

        if (!user) {
            setMessage(LOGIN_REQUIRED_MESSAGE);
            setIsLoginOpen(true);
            return;
        }

        const newOrder: FoodOrder = {
            orderId: createId(),
            userId: user.id,
            items: cart.map(({ food, quantity }) => ({
                foodId: food.id,
                name: food.name,
                price: food.price,
                quantity,
            })),
            totalPrice,
            orderedAt: new Date().toISOString(),
        };

        setFoodOrders(prev => [...prev, newOrder]);
        dispatch({ type: 'CLEAR_CART' });
        setMessage(`주문이 완료되었습니다. (${newOrder.totalPrice.toLocaleString()}원)`);
    };

    // 로그인에 성공했다면 '로그인 후 이용하세요' 안내 문구는 더 이상 보여주지 않음
    const visibleMessage = user && message === LOGIN_REQUIRED_MESSAGE ? '' : message;

    return (
        <div className="food-store-page">
            <h2>매점</h2>

            {/* 예매 완료 후 이동해 왔을 때만 보이는 안내 */}
            {fromBooking && (
                <div className="food-notice" role="status">
                    <p className="food-notice-title">
                        '{fromBooking.movieTitle}' 예매가 완료되었어요.
                    </p>
                    <p>{getRecommendText(fromBooking.headCount)}</p>
                </div>
            )}

            {/* 카테고리 탭 */}
            <div className="category-tabs">
                {CATEGORY_TABS.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        className={category === tab.value ? 'category-tab active' : 'category-tab'}
                        onClick={() => setCategory(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="food-store-layout">
                {/* 메뉴 목록 */}
                <div className="food-list">
                    {filteredMenu.map(food => (
                        <FoodCard key={food.id} food={food} onAdd={handleAdd} />
                    ))}
                </div>

                {/* 장바구니 */}
                <aside className="cart">
                    <h3>장바구니 ({totalCount})</h3>

                    {cart.length === 0 ? (
                        <p className="cart-empty">담긴 메뉴가 없습니다.</p>
                    ) : (
                        <ul className="cart-list">
                            {cart.map(({ food, quantity }) => (
                                <li key={food.id} className="cart-item">
                                    <span className="cart-item-name">{food.name}</span>
                                    <div className="cart-item-controls">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                dispatch({
                                                    type: 'UPDATE_QUANTITY',
                                                    payload: { foodId: food.id, quantity: quantity - 1 },
                                                })
                                            }
                                        >
                                            -
                                        </button>
                                        <span>{quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                dispatch({
                                                    type: 'UPDATE_QUANTITY',
                                                    payload: { foodId: food.id, quantity: quantity + 1 },
                                                })
                                            }
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="cart-item-price">
                                        {(food.price * quantity).toLocaleString()}원
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: food.id })}
                                    >
                                        삭제
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="cart-total">총 금액: {totalPrice.toLocaleString()}원</p>

                    {visibleMessage && <p className="cart-message">{visibleMessage}</p>}

                    <div className="cart-buttons">
                        <button
                            type="button"
                            onClick={() => dispatch({ type: 'CLEAR_CART' })}
                            disabled={cart.length === 0}
                        >
                            비우기
                        </button>
                        <button type="button" onClick={handleOrder}>
                            주문하기
                        </button>
                    </div>
                </aside>
            </div>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
    );
};

export default FoodStorePage;