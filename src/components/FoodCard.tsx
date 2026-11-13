// src/components/FoodCard.tsx
// 주요 기능: 매점 메뉴 (팝콘, 음료 등) 카드 출력 및 '장바구니 담기' 버튼
// 적용 개념: Props 전달
// 상호작용 연계: FoodStorePage.tsx 내에서 렌더링되며, 클릭 시 cartReducer의 ADD_ITEM 액션을 발생시킴.

import type { FoodItem } from '../types';

interface FoodCardProps {
    food: FoodItem;
    onAdd: (food: FoodItem) => void; // '장바구니 담기' 클릭 시 호출 (dispatch는 부모가 담당)
}

// 사용 예시 (FoodStorePage에서)
// <FoodCard
//     key={food.id}
//     food={food}
//     onAdd={item => dispatch({ type: 'ADD_ITEM', payload: item })}
// />
const FoodCard: React.FC<FoodCardProps> = ({ food, onAdd }) => {
    return (
        <div className="food-card">
            <img className="food-image" src={food.imageUrl} alt={food.name} />

            <div className="food-info">
                <h3 className="food-name">{food.name}</h3>
                {/* description은 선택 속성이므로 있을 때만 표시 */}
                {food.description && <p className="food-description">{food.description}</p>}
                <p className="food-price">{food.price.toLocaleString()}원</p>
            </div>

            <button type="button" className="food-add-btn" onClick={() => onAdd(food)}>
                장바구니 담기
            </button>
        </div>
    );
};

export default FoodCard;