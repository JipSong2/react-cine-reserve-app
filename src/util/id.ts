// src/util/id.ts
// 주요 기능: 예매 내역/주문 내역의 고유 ID 생성
// 상호작용 연계: BookingPage.tsx(bookingId), FoodStorePage.tsx(orderId)에서 사용.
//
// crypto.randomUUID()는 보안 컨텍스트(https 또는 localhost)에서만 지원되므로,
// 그 외 환경(예: http://192.168.x.x 로 접속한 모바일 테스트)에서는 대체 방식으로 생성함.

export const createId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};