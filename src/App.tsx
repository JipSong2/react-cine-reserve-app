// src/App.tsx
// 주요 기능: 메인 뼈대 & 라우팅 구성 (react-router-dom)
// 상호작용 연계: 상단에 Header를 상시 배치하고, 경로에 따라 5개 페이지를 전환함.
//               AuthProvider는 main.tsx에서 App 전체를 감싸고 있음.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import BookingPage from './pages/BookingPage';
import FoodStorePage from './pages/FoodStorePage';
import MyPage from './pages/MyPage';
import './App.css';

function App() {
    return (
        // Header 안에서도 Link, useNavigate를 쓰므로 BrowserRouter가 Header까지 감싸야 함
        <BrowserRouter>
            <Header />

            <main className="app-main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movie/:movieId" element={<MovieDetailPage />} />
                    <Route path="/booking/:movieId" element={<BookingPage />} />
                    <Route path="/food" element={<FoodStorePage />} />
                    <Route path="/mypage" element={<MyPage />} />
                    {/* 정의되지 않은 경로는 메인으로 이동 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </BrowserRouter>
    );
}

export default App;