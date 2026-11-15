// src/components/Footer.tsx
// 주요 기능: 화면 맨 아래 푸터 (서비스 소개, 영화 정보 제공처 TMDB 표기)
// 상호작용 연계: App.tsx에서 <main> 아래에 배치되어 모든 화면에 공통으로 보임.
//
// TMDB API를 쓰는 서비스는 TMDB에서 제공받은 데이터임을 화면에 표기하도록 되어 있음.

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <p className="footer-logo">CINE RESERVE</p>
                    <p className="footer-text">영화 예매부터 매점 주문까지 한 번에</p>
                </div>

                <p className="footer-credit">
                    영화 정보와 이미지는{' '}
                    <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
                        TMDB
                    </a>
                    에서 제공받고 있어요.
                    <br />
                    This product uses the TMDB API but is not endorsed or certified by TMDB.
                </p>
            </div>
        </footer>
    );
};

export default Footer;