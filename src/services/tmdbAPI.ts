// src/services/tmdbAPI.ts
// 주요 기능: TMDB 외부 API 호출 (현재 상영작 목록, 영화 상세 정보, 장르 목록 조회) 및 이미지 URL 생성
// 적용 개념: Async / Await, Fetch
// 상호작용 연계: hooks/useMovies.ts(목록, 장르), hooks/useMovieDetail.ts(상세)에서 호출되어 외부 데이터를 수신함.
//               같은 요청은 5분 동안 메모리에 보관(캐시)해서, 화면을 오갈 때마다 API를 다시 부르지 않음.
//               getImageUrl은 MovieCard, TicketModal, BookingPage, MyPage 등에서 포스터 주소를 만들 때 사용.

import type { Movie, Genre, MovieDetail } from '../types';

// ─────────────────────────────────────────────
// 설정값
// ─────────────────────────────────────────────
// .env 파일에 VITE_TMDB_API_KEY=발급받은키 형태로 저장해서 사용 
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// ─────────────────────────────────────────────
// 응답 타입
// ─────────────────────────────────────────────
// 영화 목록(현재 상영작, 인기 영화) 응답 구조
interface MovieListResponse {
    page: number;
    results: Movie[];
    total_pages: number;
    total_results: number;
}

// ─────────────────────────────────────────────
// 공통 fetch 유틸 (async / await)
// ─────────────────────────────────────────────
const request = async <T>(
    endpoint: string,
    params: Record<string, string | number> = {}
): Promise<T> => {
    if (!API_KEY) {
        throw new Error('TMDB API 키가 없습니다. .env 파일의 VITE_TMDB_API_KEY를 확인하세요.');
    }

    const query = new URLSearchParams({
        api_key: API_KEY,
        language: 'ko-KR',
        ...Object.fromEntries(
            Object.entries(params).map(([key, value]) => [key, String(value)])
        ),
    });

    const response = await fetch(`${BASE_URL}${endpoint}?${query.toString()}`);

    // fetch는 404, 500 같은 HTTP 에러에서 reject되지 않으므로 직접 확인
    if (!response.ok) {
        throw new Error(`TMDB 요청 실패 (${response.status}): ${response.statusText}`);
    }

    return (await response.json()) as T;
};

// ─────────────────────────────────────────────
// 메모리 캐시 (같은 요청을 짧은 시간 안에 반복하지 않기 위함)
// ─────────────────────────────────────────────
// - 목록 화면 <-> 상세/예매 화면을 오갈 때마다 같은 영화를 다시 요청하던 문제를 줄임
// - 결과 대신 'Promise'를 보관하므로, 같은 요청이 동시에 두 번 들어와도 실제 요청은 한 번만 나감
// - 실패한 요청은 보관하지 않아서 '다시 시도'가 항상 새로 요청함
// - 새로고침하면 사라지는 메모리 캐시라, 오래된 데이터가 계속 남을 걱정은 없음
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분
const cache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

const cached = <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
        return hit.promise as Promise<T>;
    }

    const promise = fetcher();
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise });

    // 실패하면 캐시에서 제거 (그 사이 같은 키로 새로 저장된 항목은 건드리지 않음)
    promise.catch(() => {
        if (cache.get(key)?.promise === promise) cache.delete(key);
    });

    return promise;
};

// ─────────────────────────────────────────────
// 외부에 공개하는 API 함수
// ─────────────────────────────────────────────

// 인기 영화 목록 조회 (현재 화면에서는 쓰지 않고, 필요할 때를 위해 남겨 둠)
export const fetchPopularMovies = async (page: number = 1): Promise<Movie[]> => {
    const data = await request<MovieListResponse>('/movie/popular', { page });
    return data.results;
};

// 현재 상영작 목록 조회 (한국 개봉 기준)
export const fetchNowPlayingMovies = (page: number = 1): Promise<Movie[]> =>
    cached(`now_playing:${page}`, async () => {
        const data = await request<MovieListResponse>('/movie/now_playing', { page, region: 'KR' });
        return data.results;
    });

// 영화 상세 정보 조회
export const fetchMovieDetail = (movieId: number): Promise<MovieDetail> =>
    cached(`detail:${movieId}`, () => request<MovieDetail>(`/movie/${movieId}`));

// 장르 목록 조회 (HomePage 장르 필터 탭에서 genre_ids를 장르명으로 변환할 때 사용)
export const fetchGenres = (): Promise<Genre[]> =>
    cached('genres', async () => {
        const data = await request<{ genres: Genre[] }>('/genre/movie/list');
        return data.genres;
    });

// 포스터/배경 이미지 전체 URL 생성
// path가 없는 영화(null)는 빈 문자열을 반환하므로, 호출하는 쪽에서 대체 이미지를 처리
export const getImageUrl = (
    path: string | null | undefined,
    size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'
): string => {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : '';
};