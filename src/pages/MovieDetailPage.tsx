// src/pages/MovieDetailPage.tsx (영화 상세 정보)
// 주요 기능: 포스터, 제목, 한 줄 소개, 개봉일, 상영 시간, 장르, 평점, 줄거리 표시 및 '예매하기' 버튼 제공
// 적용 개념: useParams, useMovieDetail (Custom Hook), 조건부 렌더링
// 상호작용 연계: HomePage의 MovieCard에서 포스터/제목을 누르면 /movie/:movieId 경로로 이동해 옴.
//               '예매하기'를 누르면 BookingPage.tsx(/booking/:movieId)로 이동.

import { useParams, useNavigate, Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useMovieDetail } from '../hooks/useMovieDetail';
import { getImageUrl } from '../services/tmdbAPI';

const MovieDetailPage: React.FC = () => {
    const { movieId } = useParams<{ movieId: string }>();
    const navigate = useNavigate();

    const { movie, isLoading, error } = useMovieDetail(Number(movieId));

    if (isLoading) return <p className="status-message">영화 정보를 불러오는 중입니다...</p>;

    if (error || !movie) {
        return (
            <div className="status-wrapper">
                <p className="status-message status-error">{error ?? '영화 정보가 없습니다.'}</p>
                <Link to="/" className="detail-back">
                    ← 영화 목록으로
                </Link>
            </div>
        );
    }

    const posterUrl = getImageUrl(movie.poster_path, 'w342');
    const backdropUrl = getImageUrl(movie.backdrop_path, 'w780');

    // 배경 이미지는 CSS 변수로 넘겨서, 어두운 그라데이션(CSS)과 함께 쓸 수 있게 함
    const heroStyle = backdropUrl
        ? ({ '--backdrop': `url(${backdropUrl})` } as CSSProperties)
        : undefined;

    return (
        <div className="detail-page">
            <Link to="/" className="detail-back">
                ← 영화 목록으로
            </Link>

            <section className="detail-hero" style={heroStyle}>
                {posterUrl ? (
                    <img className="detail-poster" src={posterUrl} alt={`${movie.title} 포스터`} />
                ) : (
                    <div className="detail-poster detail-poster-empty">포스터 없음</div>
                )}

                <div className="detail-info">
                    <h2 className="detail-title">{movie.title}</h2>

                    {/* 한 줄 소개는 없는 영화도 많으므로 있을 때만 표시 */}
                    {movie.tagline && <p className="detail-tagline">{movie.tagline}</p>}

                    <ul className="detail-meta">
                        <li>개봉 {movie.release_date || '미정'}</li>
                        <li>{movie.runtime ? `${movie.runtime}분` : '상영 시간 미정'}</li>
                        <li>
                            ⭐ {movie.vote_average.toFixed(1)}
                            {movie.vote_count ? ` (${movie.vote_count.toLocaleString()}명)` : ''}
                        </li>
                    </ul>

                    {movie.genres.length > 0 && (
                        <ul className="detail-genres">
                            {movie.genres.map(genre => (
                                <li key={genre.id}>{genre.name}</li>
                            ))}
                        </ul>
                    )}

                    <button
                        type="button"
                        className="detail-book-btn"
                        onClick={() => navigate(`/booking/${movie.id}`)}
                    >
                        예매하기
                    </button>
                </div>
            </section>

            <section className="detail-section">
                <h3>줄거리</h3>
                <p className="detail-overview">{movie.overview || '등록된 줄거리가 없습니다.'}</p>
            </section>
        </div>
    );
};

export default MovieDetailPage;