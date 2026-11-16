// src/util/seatRecommend.ts
// 주요 기능: 예매 인원수에 맞는 좌석을 자동으로 골라주는 추천 알고리즘 (순수 함수)
//           좌석 배치는 가운데 통로를 기준으로 왼쪽 구역(1~5열), 오른쪽 구역(6~10열)으로 나뉨.
//           1) 같은 줄, 같은 구역(통로를 넘지 않음)에서 붙어 있는 빈 좌석을 우선 찾음
//           2) 없으면 같은 줄에서 통로를 사이에 두고 양쪽 구역에 나눠 앉는 자리를 찾음
//           3) 그래도 없으면 가능한 큰 덩어리부터 나눠서 추천 (덩어리끼리는 가까운 줄을 우선)
//           스크린 중앙(통로)에 가깝고, 스크린에서 적당히 떨어진 자리일수록 좋은 점수를 줌
// 적용 개념: TypeScript, 순수 함수, 알고리즘 (점수 계산, 탐욕법)
// 상호작용 연계: SeatGrid.tsx의 '추천 좌석 선택' 버튼에서 호출.
//               예약 완료 좌석(isBooked)은 절대 추천하지 않으며, 받은 seats는 수정하지 않음.
//
// [점수(비용) 계산 - 낮을수록 좋은 자리]
//   좌석 점수 = |이상적인 줄과의 거리| × ROW_WEIGHT + |가운데 열(통로)과의 거리|
//   덩어리 점수 = 덩어리에 포함된 좌석 점수의 합 (+ 앞서 고른 덩어리와 줄이 멀수록 가산점)
//   동점이면 먼저 찾은 쪽을 고름 (스크린에 가까운 줄, 왼쪽 구역·왼쪽 열 순서) → 항상 같은 입력엔 같은 결과
//
// ※ 통로 위치는 App.css의 '.seat-row .seat:nth-child(5)'(5번째 좌석 뒤)와 맞춰져 있음. 통로를 옮기면 함께 수정.

import type { SeatState } from '../types';
import { SEAT_ROWS, SEATS_PER_ROW } from './schedule';

type SeatMap = { [seatId: string]: SeatState };

// 통로가 놓이는 위치: 이 열 바로 뒤 (10열이면 5열과 6열 사이)
const AISLE_AFTER_COLUMN = Math.floor(SEATS_PER_ROW / 2);
const LEFT_BLOCK_SIZE = AISLE_AFTER_COLUMN;
const RIGHT_BLOCK_SIZE = SEATS_PER_ROW - AISLE_AFTER_COLUMN;

// 이상적인 줄: 스크린에서 60% 정도 떨어진 줄 (8줄 기준 E열)
const IDEAL_ROW_INDEX = Math.round((SEAT_ROWS.length - 1) * 0.55);
// 가운데 열 = 통로 위치 (10열이면 5와 6 사이인 5.5)
const CENTER_COLUMN = (SEATS_PER_ROW + 1) / 2;
// 줄이 이상적인 줄에서 한 칸 멀어질 때의 감점 (열 한 칸보다 조금 더 크게 반영)
const ROW_WEIGHT = 1.5;
// 떨어져 앉아야 할 때, 먼저 고른 덩어리와 줄이 한 칸 멀어질 때의 감점
const GROUP_ROW_WEIGHT = 2;

export interface SeatRecommendation {
    seats: string[]; // 추천 좌석 전체 (자리가 부족하면 빈 배열)
    groups: string[][]; // 붙어 있는 덩어리별로 나눈 좌석
    // together: 모두 한 덩어리로 붙어 앉음 / aisle: 같은 줄에서 통로를 사이에 두고 앉음
    // apart: 일부가 다른 줄에 떨어져 앉음 / none: 추천할 자리가 부족함
    kind: 'together' | 'aisle' | 'apart' | 'none';
}

interface Run {
    rowIndex: number; // SEAT_ROWS에서의 줄 번호 (A = 0)
    start: number; // 시작 열 (1부터)
    size: number;
    cost: number;
}

interface RunOptions {
    anchorRow?: number | null; // 먼저 고른 덩어리의 줄 (있으면 그 줄과 가까울수록 유리)
    rowIndex?: number; // 지정하면 이 줄에서만 찾음
    block?: 0 | 1; // 지정하면 이 구역(0 왼쪽, 1 오른쪽)에서만 찾음
}

const toSeatId = (rowIndex: number, column: number): string => `${SEAT_ROWS[rowIndex]}${column}`;

// 어느 구역인지: 통로 앞 열은 0(왼쪽 구역), 뒤 열은 1(오른쪽 구역)
const blockOf = (column: number): 0 | 1 => (column <= AISLE_AFTER_COLUMN ? 0 : 1);

const seatCost = (rowIndex: number, column: number): number =>
    Math.abs(rowIndex - IDEAL_ROW_INDEX) * ROW_WEIGHT + Math.abs(column - CENTER_COLUMN);

// 같은 줄, 같은 구역(통로를 넘지 않음)에서 size개가 연달아 비어 있는 자리 중 점수가 가장 낮은 곳을 찾음 (없으면 null)
const findBestRun = (taken: Set<string>, size: number, options: RunOptions = {}): Run | null => {
    const { anchorRow = null, rowIndex: onlyRow, block: onlyBlock } = options;
    let best: Run | null = null;

    for (let rowIndex = 0; rowIndex < SEAT_ROWS.length; rowIndex++) {
        if (onlyRow !== undefined && rowIndex !== onlyRow) continue;

        for (let start = 1; start + size - 1 <= SEATS_PER_ROW; start++) {
            const end = start + size - 1;

            // 통로를 넘는 덩어리는 '붙어 앉는 것'으로 보지 않음
            if (blockOf(start) !== blockOf(end)) continue;
            if (onlyBlock !== undefined && blockOf(start) !== onlyBlock) continue;

            let cost = anchorRow === null ? 0 : Math.abs(rowIndex - anchorRow) * GROUP_ROW_WEIGHT;
            let isFree = true;

            for (let column = start; column <= end; column++) {
                if (taken.has(toSeatId(rowIndex, column))) {
                    isFree = false;
                    break;
                }
                cost += seatCost(rowIndex, column);
            }

            // 엄격한 '<'로 비교해서, 동점이면 먼저 찾은 자리를 유지
            if (isFree && (best === null || cost < best.cost)) {
                best = { rowIndex, start, size, cost };
            }
        }
    }

    return best;
};

// 같은 줄에서 통로 양쪽에 나눠 앉는 자리 중 점수 합이 가장 낮은 조합을 찾음 (없으면 null)
// 예: 6명 -> 왼쪽 3명 + 오른쪽 3명, 8명 -> 왼쪽 4명 + 오른쪽 4명
const findBestSplitAcrossAisle = (taken: Set<string>, count: number): Run[] | null => {
    let best: { runs: Run[]; cost: number } | null = null;

    for (let rowIndex = 0; rowIndex < SEAT_ROWS.length; rowIndex++) {
        for (let leftSize = 1; leftSize <= LEFT_BLOCK_SIZE; leftSize++) {
            const rightSize = count - leftSize;
            if (rightSize < 1 || rightSize > RIGHT_BLOCK_SIZE) continue;

            const left = findBestRun(taken, leftSize, { rowIndex, block: 0 });
            const right = findBestRun(taken, rightSize, { rowIndex, block: 1 });
            if (!left || !right) continue;

            const cost = left.cost + right.cost;
            if (best === null || cost < best.cost) {
                best = { runs: [left, right], cost };
            }
        }
    }

    return best ? best.runs : null;
};

const runToSeatIds = (run: Run): string[] => {
    const ids: string[] = [];
    for (let column = run.start; column < run.start + run.size; column++) {
        ids.push(toSeatId(run.rowIndex, column));
    }
    return ids;
};

// 사용 예시 (SeatGrid에서)
// const { seats: picked, kind } = recommendSeats(seats, maxSelectable);
// if (kind === 'none') { /* 자리가 부족함 */ } else { setSelectedSeats(picked); }
export const recommendSeats = (seats: SeatMap, count: number): SeatRecommendation => {
    const none: SeatRecommendation = { seats: [], groups: [], kind: 'none' };
    if (!Number.isInteger(count) || count < 1) return none;

    // 추천에서 제외할 좌석: 예약 완료 좌석 (+ 이번 추천에서 이미 고른 좌석)
    const taken = new Set<string>();
    for (let rowIndex = 0; rowIndex < SEAT_ROWS.length; rowIndex++) {
        for (let column = 1; column <= SEATS_PER_ROW; column++) {
            const seatId = toSeatId(rowIndex, column);
            if (seats[seatId]?.isBooked) taken.add(seatId);
        }
    }

    const totalSeats = SEAT_ROWS.length * SEATS_PER_ROW;
    if (totalSeats - taken.size < count) return none; // 남은 자리가 인원보다 적음

    const runs: Run[] = [];

    // 1단계: 한 구역 안에서 모두 붙어 앉는 자리
    const single = findBestRun(taken, count);
    if (single) {
        runs.push(single);
    } else {
        // 2단계: 같은 줄에서 통로를 사이에 두고 양쪽 구역에 나눠 앉는 자리
        const split = count >= 2 ? findBestSplitAcrossAisle(taken, count) : null;
        if (split) {
            runs.push(...split);
        } else {
            // 3단계: 가능한 큰 덩어리부터 차례로 채움 (먼저 고른 덩어리와 가까운 줄 우선)
            let remaining = count;
            let anchorRow: number | null = null;

            while (remaining > 0) {
                let run: Run | null = null;
                for (let size = Math.min(remaining, SEATS_PER_ROW); size >= 1; size--) {
                    run = findBestRun(taken, size, { anchorRow });
                    if (run) break;
                }
                if (!run) return none; // 위에서 남은 자리를 확인했으므로 일어나지 않는 경우

                runToSeatIds(run).forEach(seatId => taken.add(seatId));
                runs.push(run);
                remaining -= run.size;
                anchorRow = run.rowIndex;
            }
        }
    }

    const groups = runs.map(runToSeatIds);

    // 종류 판단: 덩어리가 하나면 together, 모두 같은 줄이면 aisle, 아니면 apart
    const rowsUsed = new Set(runs.map(run => run.rowIndex));
    const kind: SeatRecommendation['kind'] =
        groups.length === 1 ? 'together' : rowsUsed.size === 1 ? 'aisle' : 'apart';

    return { seats: groups.flat(), groups, kind };
};