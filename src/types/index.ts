// src/types/index.ts
// TypeScript 타입 정의
// 주요 기능: 영화, 유저, 좌석 배치, 예매 내역, 식사 메뉴, 주문 내역, 장바구니 관련 TypeScript Interface 및 Type 선언.
// 적용 개념: TypeScript Interfaces & Types (Movie, User, BookingRecord, CartItem 등).
// 상호작용 연계: 프로젝트 내 모든 .tsx / .ts 파일에서 데이터 타입을 정의할 때 참조함.

// ─────────────────────────────────────────────
// 영화 (TMDB API 연동 용도)
// ─────────────────────────────────────────────
export interface Movie {
    id: number;
    title: string;
    poster_path: string | null;   // 포스터가 없는 영화는 null
    backdrop_path: string | null; // 배경 이미지가 없는 영화는 null
    overview: string;
    vote_average: number;
    vote_count?: number;          // 평점을 준 사람 수
    release_date: string;
    genre_ids: number[];
}

// 장르 정보
export interface Genre {
    id: number;
    name: string;
}

// 영화 상세 정보 (목록 응답의 genre_ids 대신 genres 객체 배열이 내려옴)
export interface MovieDetail extends Omit<Movie, 'genre_ids'> {
    genres: Genre[];
    runtime: number | null; // 상영 시간(분)
    tagline: string;
}

// ─────────────────────────────────────────────
// 회원
// ─────────────────────────────────────────────
// 현재 로그인한 유저 ('cine_current_user')에는 비밀번호 정보를 넣지 않음
export interface User {
    id: string;
    name: string;
}

// 가입 회원 목록('cine_users')에 저장되는 회원 정보
// - passwordHash: 비밀번호를 bcrypt로 암호화한(해시) 값. 원래 비밀번호는 저장하지 않음
// - password: 예전에 평문으로 저장했던 데이터. 앱을 켜면 자동으로 passwordHash로 바뀌고 지워짐
export interface StoredUser extends User {
    passwordHash?: string;
    password?: string;
}

// ─────────────────────────────────────────────
// 좌석 / 상영 회차
// ─────────────────────────────────────────────
// 개별 좌석
export interface SeatState {
    id: string;     // 'A1', 'B3'
    row: string;    // 'A', 'B'
    number: number; // 1, 2, 3
    isBooked: boolean;
    bookedBy?: string; // 예약한 유저 id
}

// 영화 상영 회차 정보
export interface MovieSchedule {
    scheduleId: string; // "MOVIE_1053359_2026-11-10_15:00"
    movieId: number;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    seats: { [seatId: string]: SeatState }; // A1: { id: 'A1', row: 'A', number: 1, isBooked: false }
}

// ─────────────────────────────────────────────
// 예매 내역
// ─────────────────────────────────────────────
export interface BookingRecord {
    bookingId: string; // 고유한 예매 id (UUID)
    userId: string;
    movieId: number;   // Movie.id, MovieSchedule.movieId와 같은 number 타입으로 통일
    movieTitle: string;
    posterPath: string | null;
    scheduleDate: string;
    scheduleTime: string;
    selectedSeats: string[]; // ['A1', 'A2']
    headCount: {
        adult: number; // 성인 수
        youth: number; // 청소년 수
    };
    totalPrice: number;
    bookedAt: string;
}

// ─────────────────────────────────────────────
// 매점 / 장바구니 / 주문 내역
// ─────────────────────────────────────────────
// 식사 메뉴
export interface FoodItem {
    id: string;
    name: string;
    category: 'popcorn' | 'drink' | 'snack' | 'combo';
    price: number;
    imageUrl: string;
    description?: string;
}

// 장바구니 항목
export interface CartItem {
    food: FoodItem;
    quantity: number;
}

// cartReducer에서 처리하는 액션
export type CartAction =
    | { type: 'ADD_ITEM'; payload: FoodItem }
    | { type: 'REMOVE_ITEM'; payload: string } // 음식 ID
    | { type: 'UPDATE_QUANTITY'; payload: { foodId: string; quantity: number } }
    | { type: 'CLEAR_CART' };

// 매점 주문 내역 (localStorage 'foodOrders' 키에 저장)
export interface FoodOrder {
    orderId: string; // 고유한 주문 id (UUID)
    userId: string;
    items: { foodId: string; name: string; price: number; quantity: number }[];
    totalPrice: number;
    orderedAt: string;
}

// 예매 완료 후 매점으로 이동할 때 함께 넘기는 정보 (react-router의 navigate state)
export interface FoodRecommendState {
    movieTitle: string;
    headCount: number; // 예매한 총 인원
}