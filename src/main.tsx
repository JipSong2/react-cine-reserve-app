// src/main.tsx
// 주요 기능: 애플리케이션 시작점 (Provider 감싸기)
// 상호작용 연계: 전체 앱을 AuthProvider로 감싸서, Header / LoginModal / BookingPage / MyPage 등
//               어디서든 useAuth()로 로그인 상태를 사용할 수 있게 함.
//               그 안쪽에서 CartProvider로 감싸서, 페이지를 이동해도 매점 장바구니가 유지되게 함 (useCart()).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </AuthProvider> 
    </StrictMode>
);