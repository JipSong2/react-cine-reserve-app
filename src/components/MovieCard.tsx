// src/components/MovieCard.tsx
// 주요 기능: 영화 포스터, 제목, 개봉일, 평점 카드 표시 및 '예매하기' 버튼 제공 (포스터/제목을 누르면 상세 정보)
// 적용 개념: Props 전달, useCallback (버튼 클릭 이벤트 최적화)
// 상호작용 연계: HomePage.tsx 내부에서 .map()을 돌며 영화 목록 카드로 분리 렌더링됨.
//               예매하기 클릭 시 BookingPage.tsx, 포스터/제목 클릭 시 MovieDetailPage.tsx로 이동하며 movieId 전달.

import { memo, useCallback } from 'react';
import type { Movie } from '../types';
import { getImageUrl } from '../services/tmdbAPI';

interface MovieCardProps {
    movie: Movie;
    onBook: (movieId: number) => void; // 예매하기 클릭 시 호출 (이동 처리는 부모가 담당)
    onDetail: (movieId: number) => void; // 포스터/제목 클릭 시 호출 (상세 정보 화면으로 이동)
}

// 사용 예시 (HomePage에서)
// const handleBook = useCallback((movieId: number) => navigate(`/booking/${movieId}`), [navigate]);
// const handleDetail = useCallback((movieId: number) => navigate(`/movie/${movieId}`), [navigate]);
// {filteredMovies.map(movie => (
//     <MovieCard key={movie.id} movie={movie} onBook={handleBook} onDetail={handleDetail} />
// ))}
const MovieCard: React.FC<MovieCardProps> = ({ movie, onBook, onDetail }) => {
    // 버튼 클릭 핸들러: movie.id나 onBook이 바뀔 때만 새로 생성
    const handleBookClick = useCallback(() => {
        onBook(movie.id);
    }, [onBook, movie.id]);

    // 포스터/제목 클릭 핸들러
    const handleDetailClick = useCallback(() => {
        onDetail(movie.id);
    }, [onDetail, movie.id]);

    const posterUrl = getImageUrl(movie.poster_path, 'w342');

    return (
        <div className="movie-card">
            <button
                type="button"
                className="movie-poster-btn"
                onClick={handleDetailClick}
                aria-label={`${movie.title} 상세 정보`}
            >
                {posterUrl ? (
                    <img className="movie-poster" src={posterUrl} alt={`${movie.title} 포스터`} />
                ) : (
                    // 포스터가 없는 영화를 위한 대체 영역
                    <div className="movie-poster movie-poster-empty">포스터 없음</div>
                )}
            </button>

            <div className="movie-info">
                <h3 className="movie-title">
                    <button type="button" className="movie-title-btn" onClick={handleDetailClick}>
                        {movie.title}
                    </button>
                </h3>
                <p className="movie-release">개봉일: {movie.release_date || '미정'}</p>
                <p className="movie-rating">⭐ {movie.vote_average.toFixed(1)}</p>
            </div>

            <button type="button" className="movie-book-btn" onClick={handleBookClick}>
                예매하기
            </button>
        </div>
    );
};

// memo: props(movie, onBook, onDetail)가 그대로면 리렌더링하지 않음
// → 부모에서 onBook, onDetail을 useCallback으로 넘겨야 최적화 효과가 있음
export default memo(MovieCard);