import React from 'react';
import { Font } from '../components/Font';
import { Card } from '../components/Card/Card';
import { Grid } from '../components/Layout/Grid';
import { Icon } from '../components/Icon/Icon';

const Rules: React.FC = () => {
    return (
        <Grid columns={1} gap={3}>
            {/* 1. 헤더 */}
            <Font variant="heading-3" weight="medium" as="h1">
                Rules & Logs
            </Font>

            {/* 2. Error & Check */}
            <Card as="section" className="pa-4">
                <Font variant="subtitle" weight="bold" as="h2" className="pb-2 mb-3 divider-bottom d-block">
                    Error & Check
                </Font>

                <Grid columns={1} gap={3}>
                    <div>
                        <Font variant="heading-3" weight="semibold" as="h3" className="mb-2 d-block">무기 시스템</Font>
                        <Grid as="ul" columns={1} gap={1} className="pl-3 ma-0 list-disc">
                            <li>
                                <Font variant="body">클립 샷건, 런쳐 구현</Font>
                                <Grid as="ul" columns={1} gap={0} className="pl-3 mt-1 list-disc">
                                    <li><Font variant="reading" color="muted">장탄 증가시 재장전 횟수가 늘어나는 것으로 확인</Font></li>
                                    <li><Font variant="reading" color="muted">장탄 증가시 재장전, 재장전 마다 탄약 수가 늘어나는 것도 확인</Font></li>
                                </Grid>
                            </li>
                            <li><Font variant="body">차댐 테스트 필요</Font></li>
                        </Grid>
                    </div>

                    <div>
                        <Font variant="subtitle" weight="semibold" as="h3" className="mb-2 d-block">무기 대미지</Font>
                        <Grid as="ul" columns={1} gap={0} className="pl-3 ma-0 list-disc">
                            <li><Font variant="body">RL, SR 소장품 차지 대미지 배율 적용시 대미지 수치 틀림</Font></li>
                        </Grid>
                    </div>

                    <div>
                        <Font variant="subtitle" weight="semibold" as="h3" className="mb-2 d-block">사거리 보너스</Font>
                        <Font variant="body" color="muted">-</Font>
                    </div>
                </Grid>
            </Card>

            {/* 3. Log */}
            <Card as="section" className="pa-4">
                <Font variant="subtitle" weight="bold" as="h2" className="pb-2 mb-3 divider-bottom d-block">
                    Log
                </Font>
                <Grid as="ul" columns={1} gap={2} className="pl-0 ma-0" style={{ listStyle: 'none' }}>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">추가 대미지 등 스킬로 발생하는 대미지에 사거리 보너스 적용X, 사거리 보너스는 무기로 직접 공격하는 경우, 평타만 적용한다.</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <Font variant="body">캐릭터 스킬 효과별 분리 완료, 마르차나 1스킬 최종 공격력이 높은 아군 2기에게 체력 회복량 증가 효과가 타임라인에 찍히지 않음</Font>
                            <div className="d-flex mt-1" style={{ alignItems: 'flex-start', gap: '6px', paddingLeft: '16px' }}>
                                <Icon name="check" size={16} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                                <Font variant="reading" color="muted">버프 트리거 확인 및 버프 분리하여 타임라인에 찍음</Font>
                            </div>
                        </div>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">burst_cast 트리거 발동 확인, 볼륨 2스킬 드랍 더 비트 효과가 적용되지 않음?</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">볼륨 2스킬 드랍 더 비트 하위 효과 중복 적용 작동 되는지 테스트</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">2B 추가 체력 비례 공증 효과 적용 확인</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">스킬 대미지에도 공증 버프 등 효과 적용되는지 확인 필요</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">getFinalAtk, 캐릭터 최종 공격력 계산식에 오버로드 장비 포함인지 확인</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">아르카나 스킬 트리거 추가해야함</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">큐브 효과 tier 시스템 3단계 사용하여 레벨별로 잘 적용되어 있음</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">공격계수 평타에만 적용되고 있는 것 확인</Font>
                    </li>
                    <li className="d-flex" style={{ alignItems: 'flex-start', gap: '8px' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--Status-Success-100)', flexShrink: 0, marginTop: '2px' }} />
                        <Font variant="body">큐브 및 오버로드 장비효과 적용 완료 확인</Font>
                    </li>
                </Grid>
            </Card>
        </Grid>
    );
};

export default Rules;

