// src/components/HeroBanner.tsx
// 주요 기능: 메인 화면 맨 위에 추천 영화를 큰 배경 이미지로 보여주는 배너 (자동으로 넘어가고, 아래 점을 눌러 직접 선택 가능)
// 적용 개념: Props 전달, useState (현재 순서, 일시정지), useEffect (자동 넘김 타이머와 정리), 조건부 렌더링
// 상호작용 연계: HomePage.tsx 맨 위에 배치됨. '예매하기'는 /booking/:movieId, '상세 정보'는 /movie/:movieId로 이동
//               (이동 처리는 부모가 담당). 마우스를 올리거나 키보드로 버튼에 이동해 있는 동안에는 넘어가지 않음.

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Movie } from '../types';
import { getImageUrl } from '../services/tmdbAPI';

const AUTO_SLIDE_MS = 6000; // 자동으로 다음 영화로 넘어가는 간격

interface HeroBannerProps {
    movies: Movie[]; // 배경 이미지가 있는 영화만 넘겨주세요
    onBook: (movieId: number) => void; // 예매하기 클릭 시 호출
    onDetail: (movieId: number) => void; // 상세 정보 클릭 시 호출
}

// 사용 예시 (HomePage에서)
// <HeroBanner movies={heroMovies} onBook={handleBook} onDetail={handleDetail} />
const HeroBanner: React.FC<HeroBannerProps> = ({ movies, onBook, onDetail }) => {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const count = movies.length;

    // 자동 넘김: 영화가 2편 이상이고 일시정지가 아닐 때만 동작
    // index가 바뀌면(점을 눌렀을 때 포함) 타이머를 새로 시작해서, 직접 고른 영화가 바로 넘어가지 않게 함
    useEffect(() => {
        if (count <= 1 || isPaused) return;

        // 움직임을 줄이도록 설정한 사용자는 자동으로 넘기지 않음
        if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const timer = window.setInterval(() => {
            setIndex(prev => (prev + 1) % count);
        }, AUTO_SLIDE_MS);

        // 클린업 함수: 다음 실행 전 또는 언마운트 시 타이머 해제
        return () => window.clearInterval(timer);
    }, [count, isPaused, index]);

    if (count === 0) return null;

    // 영화 목록이 줄어들어도 범위를 벗어나지 않도록 보정
    const currentIndex = index % count;
    const movie = movies[currentIndex];

    // 배경 이미지는 CSS 변수로 넘겨서, 어두운 그라데이션(CSS)과 함께 쓸 수 있게 함
    const backdropUrl = getImageUrl(movie.backdrop_path, 'w1280');
    const slideStyle = backdropUrl
        ? ({ '--hero-bg': `url(${backdropUrl})` } as CSSProperties)
        : undefined;

    return (
        <section
            className="hero"
            aria-label="추천 영화"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
        >
            {/* key가 바뀌면 새로 그려져서 부드럽게 나타나는 효과가 다시 실행됨 */}
            <article key={movie.id} className="hero-slide" style={slideStyle}>
                <div className="hero-content">
                    <p className="hero-meta">
                        {movie.release_date ? `${movie.release_date} 개봉` : '개봉일 미정'} · 평점{' '}
                        {movie.vote_average.toFixed(1)}
                    </p>
                    <h3 className="hero-title">{movie.title}</h3>
                    {/* 줄거리는 없는 영화도 있으므로 있을 때만 표시 */}
                    {movie.overview && <p className="hero-overview">{movie.overview}</p>}

                    <div className="hero-actions">
                        <button type="button" className="hero-book-btn" onClick={() => onBook(movie.id)}>
                            예매하기
                        </button>
                        <button type="button" className="hero-detail-btn" onClick={() => onDetail(movie.id)}>
                            상세 정보
                        </button>
                    </div>
                </div>
            </article>

            {/* 영화가 한 편뿐이면 점은 필요 없음 */}
            {count > 1 && (
                <div className="hero-dots">
                    {movies.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            className={i === currentIndex ? 'hero-dot active' : 'hero-dot'}
                            aria-label={`${i + 1}번째 추천 영화: ${item.title}`}
                            aria-current={i === currentIndex ? 'true' : undefined}
                            onClick={() => setIndex(i)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default HeroBanner;