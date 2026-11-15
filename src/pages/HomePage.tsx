// src/pages/HomePage.tsx (메인 영화 목록)
// 주요 기능: 맨 위 추천 영화 배너, 현재 상영작 목록 표시, 영화 검색창, 장르별 필터 탭, 정렬(기본/평점/최신 개봉), 불러오기 실패 시 다시 시도
// 적용 개념: useMovies (Custom Hook), useMemo (검색어, 장르 필터링, 정렬 결과 캐싱), useCallback
// 상호작용 연계: HeroBanner.tsx(추천 배너)와 MovieCard.tsx 목록을 출력하고, 예매하기 클릭 시 /booking/:movieId,
//               포스터/제목 클릭 시 /movie/:movieId(상세 정보) 경로로 이동

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovies } from '../hooks/useMovies';
import MovieCard from '../components/MovieCard';
import HeroBanner from '../components/HeroBanner';

type SortOption = 'default' | 'rating' | 'release';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'default', label: '기본순' },
    { value: 'rating', label: '평점 높은 순' },
    { value: 'release', label: '최신 개봉 순' },
];

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { movies, genres, isLoading, error, refetch } = useMovies();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null); // null = 전체
    const [sortOption, setSortOption] = useState<SortOption>('default');

    // 현재 불러온 영화에 실제로 포함된 장르만 탭으로 표시 (결과가 0개인 탭 방지)
    const availableGenres = useMemo(() => {
        const usedGenreIds = new Set(movies.flatMap(movie => movie.genre_ids));
        return genres.filter(genre => usedGenreIds.has(genre.id));
    }, [movies, genres]);

    // 상단 배너에 보여줄 영화: 배경 이미지가 있는 앞쪽 5편 (검색/장르/정렬과 상관없이 고정)
    const heroMovies = useMemo(
        () => movies.filter(movie => movie.backdrop_path).slice(0, 5),
        [movies]
    );

    // 검색어 + 장르 필터링 + 정렬 결과를 캐싱: 관련 값이 바뀔 때만 다시 계산
    const filteredMovies = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        // filter는 새 배열을 반환하므로, 아래 sort가 원본(movies)을 건드리지 않음
        const filtered = movies.filter(movie => {
            const matchesSearch = movie.title.toLowerCase().includes(keyword);
            const matchesGenre =
                selectedGenreId === null || movie.genre_ids.includes(selectedGenreId);
            return matchesSearch && matchesGenre;
        });

        if (sortOption === 'rating') {
            return filtered.sort((a, b) => b.vote_average - a.vote_average);
        }
        if (sortOption === 'release') {
            // 개봉일이 없는 영화(빈 문자열)는 맨 뒤로
            return filtered.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
        }
        return filtered; // 기본순: API가 내려준 순서 그대로
    }, [movies, searchTerm, selectedGenreId, sortOption]);

    // MovieCard(memo)에 넘기는 함수: useCallback으로 고정해야 카드가 불필요하게 리렌더링되지 않음
    const handleBook = useCallback(
        (movieId: number) => {
            navigate(`/booking/${movieId}`);
        },
        [navigate]
    );

    // 포스터/제목 클릭 시 상세 정보 화면으로 이동
    const handleDetail = useCallback(
        (movieId: number) => {
            navigate(`/movie/${movieId}`);
        },
        [navigate]
    );

    if (isLoading) {
        return <p className="status-message">영화 목록을 불러오는 중입니다...</p>;
    }

    if (error) {
        return (
            <div className="status-wrapper">
                <p className="status-message status-error">{error}</p>
                <button type="button" onClick={refetch}>
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="home-page">
            <HeroBanner movies={heroMovies} onBook={handleBook} onDetail={handleDetail} />

            <h2>현재 상영작</h2>

            <input
                type="text"
                className="search-input"
                placeholder="영화 제목을 검색하세요"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />

            <select
                className="sort-select"
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                aria-label="정렬 기준"
            >
                {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <div className="genre-tabs">
                <button
                    type="button"
                    className={selectedGenreId === null ? 'genre-tab active' : 'genre-tab'}
                    onClick={() => setSelectedGenreId(null)}
                >
                    전체
                </button>
                {availableGenres.map(genre => (
                    <button
                        key={genre.id}
                        type="button"
                        className={selectedGenreId === genre.id ? 'genre-tab active' : 'genre-tab'}
                        onClick={() => setSelectedGenreId(genre.id)}
                    >
                        {genre.name}
                    </button>
                ))}
            </div>

            {filteredMovies.length === 0 ? (
                <p className="status-message">조건에 맞는 영화가 없습니다.</p>
            ) : (
                <div className="movie-list">
                    {filteredMovies.map(movie => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onBook={handleBook}
                            onDetail={handleDetail}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomePage;