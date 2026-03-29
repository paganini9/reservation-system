/**
 * 선착순 동시 예약 테스트
 *
 * 시나리오: 같은 공간·시간대에 10개 요청을 동시에 발생시켜
 * 정확히 1개만 성공(201)하고 나머지 9개는 409 Conflict를 반환하는지 검증.
 *
 * Phase 2 Step 2-9에서 reservation-agent 구현 완료 후
 * test-agent가 이 파일을 완성한다.
 */

import { resetAndSeedDatabase } from '../setup';

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe('선착순 동시 예약', () => {
  it('10개 동시 요청 중 1개만 성공해야 한다', async () => {
    // TODO: Phase 2 완료 후 test-agent가 구현
    // 1. 테스트 사용자 10명으로 같은 공간·시간대 예약 요청 동시 발생
    // 2. 성공 응답(201) 수 === 1 검증
    // 3. 실패 응답(409, code: CONFLICT) 수 === 9 검증
    expect(true).toBe(true); // placeholder
  });
});
