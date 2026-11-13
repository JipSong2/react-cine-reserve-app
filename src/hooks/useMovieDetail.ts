// src/hooks/useMovieDetail.ts
// 주요 기능: 영화 한 편의 상세 정보 수신, 로딩 상태(isLoading), 에러(error) 관리를 한곳에 묶어 제공
// 적용 개념: Custom Hooks, useState, useEffect
// 상호작용 연계: MovieDetailPage.tsx(상세 정보 화면), BookingPage.tsx(예매 화면 상단 영화 정보)에서 호출하여 사용

import { useState, useEffect } from 'react';
import type { MovieDetail } from '../types';
import { fetchMovieDetail } from '../services/tmdbAPI';

// 사용 예시
// const { movie, isLoading, error } = useMovieDetail(Number(movieId));
export function useMovieDetail(movieId: number) {
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 주소창에 이상한 값이 들어온 경우 API를 호출하지 않음
        if (!Number.isInteger(movieId) || movieId <= 0) {
            setMovie(null);
            setError('잘못된 영화 정보입니다.');
            setIsLoading(false);
            return;
        }

        // 컴포넌트가 사라진 뒤(또는 다른 영화로 바뀐 뒤)에 상태를 바꾸는 것을 막기 위한 플래그
        let isCancelled = false;

        const loadMovie = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const detail = await fetchMovieDetail(movieId);
                if (!isCancelled) setMovie(detail);
            } catch (err) {
                if (!isCancelled) {
                    setMovie(null);
                    setError(
                        err instanceof Error ? err.message : '영화 정보를 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        loadMovie();

        // 클린업 함수: 언마운트 시 실행
        return () => {
            isCancelled = true;
        };
    }, [movieId]);

    return { movie, isLoading, error };
}