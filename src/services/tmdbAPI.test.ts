// src/services/tmdbAPI.test.ts
// tmdbAPI의 메모리 캐시가 의도대로 동작하는지 검사 (실제 네트워크 요청은 가짜 fetch로 대체)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const okResponse = (body: unknown) =>
    Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(body),
    } as unknown as Response);

const errorResponse = () =>
    Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({}),
    } as unknown as Response);

describe('tmdbAPI 캐시', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let api: typeof import('./tmdbAPI');

    beforeEach(async () => {
        vi.resetModules(); // 모듈을 새로 불러와서 테스트마다 캐시를 비움
        vi.stubEnv('VITE_TMDB_API_KEY', 'test-key');
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        api = await import('./tmdbAPI');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('같은 영화 상세를 두 번 요청해도 실제 요청은 한 번만 나간다', async () => {
        fetchMock.mockImplementation(() => okResponse({ id: 1, title: '영화' }));

        const first = await api.fetchMovieDetail(1);
        const second = await api.fetchMovieDetail(1);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
    });

    it('동시에 같은 요청이 들어와도 실제 요청은 한 번만 나간다', async () => {
        fetchMock.mockImplementation(() => okResponse({ id: 1, title: '영화' }));

        await Promise.all([api.fetchMovieDetail(1), api.fetchMovieDetail(1)]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('다른 영화는 각각 요청한다', async () => {
        fetchMock.mockImplementation(() => okResponse({ id: 1 }));

        await api.fetchMovieDetail(1);
        await api.fetchMovieDetail(2);

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('실패한 요청은 보관하지 않아서, 다시 부르면 새로 요청한다', async () => {
        fetchMock
            .mockImplementationOnce(() => errorResponse())
            .mockImplementationOnce(() => okResponse({ id: 1, title: '영화' }));

        await expect(api.fetchMovieDetail(1)).rejects.toThrow('500');
        const retry = await api.fetchMovieDetail(1);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(retry).toEqual({ id: 1, title: '영화' });
    });

    it('5분이 지나면 다시 요청한다', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-13T12:00:00'));
        fetchMock.mockImplementation(() => okResponse({ id: 1 }));

        await api.fetchMovieDetail(1);

        vi.setSystemTime(new Date('2026-11-13T12:04:59'));
        await api.fetchMovieDetail(1);
        expect(fetchMock).toHaveBeenCalledTimes(1); // 아직 5분 전

        vi.setSystemTime(new Date('2026-11-13T12:05:01'));
        await api.fetchMovieDetail(1);
        expect(fetchMock).toHaveBeenCalledTimes(2); // 5분 지남
    });

    it('현재 상영작은 한국(KR) 기준 now_playing으로 요청한다', async () => {
        fetchMock.mockImplementation(() => okResponse({ page: 1, results: [{ id: 7 }], total_pages: 1, total_results: 1 }));

        const movies = await api.fetchNowPlayingMovies();

        const url = String(fetchMock.mock.calls[0][0]);
        expect(url).toContain('/movie/now_playing');
        expect(url).toContain('region=KR');
        expect(movies).toEqual([{ id: 7 }]);
    });
});