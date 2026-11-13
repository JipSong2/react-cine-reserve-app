// src/hooks/useMovies.ts
// 주요 기능: 영화 API 데이터 수신, 로딩 상태(isLoading), 에러(error) 관리를 한곳에 묶어 제공
// 적용 개념: Custom Hooks, useState, useEffect
// 상호작용 연계: HomePage.tsx에서 영화 목록을 화면에 렌더링할 때 바로 호출하여 사용

import { useState, useEffect, useCallback } from 'react';
import type { Movie, Genre } from '../types';
import { fetchNowPlayingMovies, fetchGenres } from '../services/tmdbAPI';

// 사용 예시
// const { movies, genres, isLoading, error, refetch } = useMovies();
// 에러가 났을 때 refetch()를 호출하면 다시 불러옴
export function useMovies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // 값이 바뀌면 effect가 다시 실행되어 데이터를 새로 불러옴 (refetch 용)
    const [reloadKey, setReloadKey] = useState<number>(0);

    const refetch = useCallback(() => setReloadKey(key => key + 1), []);

    useEffect(() => {
        // 컴포넌트가 사라진 뒤에 상태를 바꾸는 것을 막기 위한 플래그
        let isCancelled = false;

        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 영화 목록과 장르 목록을 동시에 요청 (하나가 실패해도 나머지 결과는 받음)
                const [movieResult, genreResult] = await Promise.allSettled([
                    fetchNowPlayingMovies(),
                    fetchGenres(),
                ]);

                if (isCancelled) return;

                // 영화 목록은 필수: 실패하면 catch로 넘겨 에러 메시지를 보여줌
                if (movieResult.status === 'rejected') {
                    throw movieResult.reason;
                }
                setMovies(movieResult.value);

                // 장르는 필터 탭에만 쓰이므로, 실패하면 '전체' 탭만 보여주고 영화 목록은 그대로 표시
                setGenres(genreResult.status === 'fulfilled' ? genreResult.value : []);
            } catch (err) {
                if (!isCancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '영화 정보를 불러오는 중 오류가 발생했습니다.'
                    );
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        // 클린업 함수: 언마운트 시 실행
        return () => {
            isCancelled = true;
        };
    }, [reloadKey]);

    return { movies, genres, isLoading, error, refetch };
}