import React from 'react';
import { Font } from '../components/Font';

const Rules: React.FC = () => {
    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: '#e0e0e0', textAlign: 'left' }}>
            <Font variant="display-2" weight="bold" as="h1" style={{ marginBottom: '24px', display: 'block' }}>
                Rules & Logs
            </Font>

            <section style={{ marginBottom: '40px' }}>
                <Font variant="heading-1" weight="bold" as="h2" style={{ borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '24px', display: 'block' }}>
                    Error & Check
                </Font>

                <div style={{ marginBottom: '24px' }}>
                    <Font variant="heading-3" weight="semibold" as="h3" style={{ marginBottom: '12px', display: 'block' }}>무기 시스템</Font>
                    <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                        <li>
                            <Font variant="body">클립 샷건, 런쳐 구현</Font>
                            <ul style={{ paddingLeft: '24px', marginTop: '4px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <li><Font variant="reading">장탄 증가시 재장전 횟수가 늘어나는 것으로 확인</Font></li>
                                <li><Font variant="reading">장탄 증가시 재장전, 재장전 마다 탄약 수가 늘어나는 것도 확인</Font></li>
                            </ul>
                        </li>
                        <li><Font variant="body">차댐 테스트 필요</Font></li>
                    </ul>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <Font variant="heading-3" weight="semibold" as="h3" style={{ marginBottom: '12px', display: 'block' }}>무기 대미지</Font>
                    <ul style={{ paddingLeft: '24px', margin: 0 }}>
                        <li><Font variant="body">RL, SR 소장품 차지 대미지 배율 적용시 대미지 수치 틀림</Font></li>
                    </ul>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <Font variant="heading-3" weight="semibold" as="h3" style={{ marginBottom: '12px', display: 'block' }}>사거리 보너스</Font>
                    <Font variant="body" style={{ color: '#aaa' }}>-</Font>
                </div>
            </section>

            <section>
                <Font variant="heading-1" weight="bold" as="h2" style={{ borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '24px', display: 'block' }}>
                    Log
                </Font>
                <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px', margin: 0 }}>
                    <li><Font variant="body">V 추가 대미지 등 스킬로 발생하는 대미지에 사거리 보너스 적용X, 사거리 보너스는 무기로 직접 공격하는 경우, 평타만 적용한다.</Font></li>
                    <li>
                        <Font variant="body">V 캐릭터 스킬 효과별 분리 완료, 마르차나 1스킬 최종 공격력이 높은 아군 2기에게 체력 회복량 증가 효과가 타임라인에 찍히지 않음</Font>
                        <ul style={{ paddingLeft: '24px', marginTop: '4px', color: '#aaa' }}>
                            <li><Font variant="reading">V 버프 트리거 확인 및 버프 분리하여 타임라인에 찍음</Font></li>
                        </ul>
                    </li>
                    <li><Font variant="body">V burst_cast 트리거 발동 확인, 볼륨 2스킬 드랍 더 비트 효과가 적용되지 않음?</Font></li>
                    <li><Font variant="body">V 볼륨 2스킬 드랍 더 비트 하위 효과 중복 적용 작동 되는지 테스트</Font></li>
                    <li><Font variant="body">V 2B 추가 체력 비례 공증 효과 적용 확인</Font></li>
                    <li><Font variant="body">V 스킬 대미지에도 공증 버프 등 효과 적용되는지 확인 필요</Font></li>
                    <li><Font variant="body">V getFinalAtk, 캐릭터 최종 공격력 계산식에 오버로드 장비 포함인지 확인</Font></li>
                    <li><Font variant="body">V 아르카나 스킬 트리거 추가해야함</Font></li>
                    <li><Font variant="body">V 큐브 효과 tier 시스템 3단계 사용하여 레벨별로 잘 적용되어 있음</Font></li>
                </ul>
            </section>
        </div>
    );
};

export default Rules;
