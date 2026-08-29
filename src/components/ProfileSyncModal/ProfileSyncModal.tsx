import React, { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Font } from '../Font';
import { parseAndSyncProfileCsv, CsvSyncResult } from '../../utils/csvProfileSync';
import { SavedOutpostState, loadOutpostState } from '../../utils/storageUtils';
import styles from './ProfileSyncModal.module.scss';

interface ProfileSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSyncComplete?: (outpost: SavedOutpostState) => void;
}

export const ProfileSyncModal: React.FC<ProfileSyncModalProps> = ({
    isOpen,
    onClose,
    onSyncComplete,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CsvSyncResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileProcess = (file: File) => {
        if (!file) return;
        setFileName(file.name);
        setIsLoading(true);
        setErrorMsg(null);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const syncRes = parseAndSyncProfileCsv(text);

                if (syncRes.success) {
                    setResult(syncRes);
                    const freshOutpost = loadOutpostState();
                    onSyncComplete?.(freshOutpost);
                } else {
                    setErrorMsg(syncRes.error || 'CSV 파싱에 실패했습니다.');
                }
            } catch (err: any) {
                setErrorMsg(err.message || '파일을 읽는 도중 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file, 'utf-8');
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileProcess(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileProcess(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="니케 육성 데이터 동기화 (CSV 파일 업로드)"
            maxWidth={580}
        >
            <div className={styles['sync-container']}>
                {/* CSV 업로드 영역 */}
                <div
                    className={styles['file-upload-area']}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <input
                        type="file"
                        id="profile-csv-input"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleFileInput}
                    />
                    <label htmlFor="profile-csv-input" style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                        <Font as="div" variant="body" weight="bold" color="default" style={{ marginBottom: '6px' }}>
                            {fileName ? fileName : 'CSV 파일을 여기에 드래그하거나 클릭하여 선택하세요'}
                        </Font>
                        <Font as="div" variant="caption-2" color="muted">
                            니케정보_.csv 형식의 파일을 업로드하여 캐릭터 육성 정보와 전초기지 스펙을 동기화합니다.
                        </Font>
                    </label>
                </div>

                {/* 지원 컬럼 안내 */}
                <div className={styles['guide-box']}>
                    <Font as="div" variant="caption-1" weight="bold" color="default">
                        📌 자동 반영 항목
                    </Font>
                    <div className={styles['guide-step']}>
                        <span className={styles['step-num']}>1</span>
                        <span><b>캐릭터 스펙:</b> 돌파, 코강, 호감도, 스킬 1/2/버스트 레벨, 소장품/애장품 단계, 큐브 및 큐브 레벨</span>
                    </div>
                    <div className={styles['guide-step']}>
                        <span className={styles['step-num']}>2</span>
                        <span><b>오버로드 장비:</b> 4부위 티어 및 9개 옵션 합산 퍼센트 (우코, 공증, 장탄, 크확, 크댐, 명중, 차댐, 차속, 방어)</span>
                    </div>
                    <div className={styles['guide-step']}>
                        <span className={styles['step-num']}>3</span>
                        <span><b>전초기지 연구:</b> 공용 연구 레벨 및 클래스(3종) / 기업(5종) 재활용실 콘솔 레벨</span>
                    </div>
                </div>

                {/* 로딩 진행 표시 */}
                {isLoading && (
                    <div className={styles['progress-box']}>
                        <Font as="div" variant="caption-2" color="default">
                            CSV 데이터를 분석하고 로컬 스토리지에 저장하는 중...
                        </Font>
                    </div>
                )}

                {/* 결과 요약 */}
                {result && result.success && (
                    <div className={styles['status-badge-success']}>
                        <Font as="div" variant="caption-1" weight="bold">
                            🎉 동기화 완료: 총 {result.syncedCount}명의 니케 육성 데이터가 저장되었습니다!
                        </Font>
                        <Font as="div" variant="footnote" color="default">
                            전초기지 콘솔 레벨(공용: {result.outpost.commonResearchLevel}, 화력: {result.outpost.attackerConsole}, 방어: {result.outpost.defenderConsole}, 지원: {result.outpost.supporterConsole})이 홈 화면에 즉시 적용되었습니다.
                        </Font>
                        {result.warnings.length > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--Status-Warning-100)' }}>
                                ⚠️ {result.warnings.length}개 캐릭터 제외됨: {result.warnings.slice(0, 3).join(', ')}
                                {result.warnings.length > 3 ? ` 외 ${result.warnings.length - 3}건` : ''}
                            </div>
                        )}
                    </div>
                )}

                {/* 에러 메시지 */}
                {errorMsg && (
                    <div className={styles['status-badge-error']}>
                        <Font as="div" variant="caption-2" weight="semibold">
                            ⚠️ {errorMsg}
                        </Font>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ProfileSyncModal;
