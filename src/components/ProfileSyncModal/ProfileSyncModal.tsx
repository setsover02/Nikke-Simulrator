import React, { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Font } from '../Font';
import { syncBlablalinkProfile, importProfileFromJson, SyncedProfileResult } from '../../utils/profileSync';
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
    const [tab, setTab] = useState<'cookie' | 'file'>('cookie');
    const [cookieInput, setCookieInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [result, setResult] = useState<SyncedProfileResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleCookieSync = async () => {
        if (!cookieInput.trim()) {
            setErrorMsg('쿠키를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        setResult(null);
        setProgressText('동기화 준비 중...');
        setProgressPercent(0);

        try {
            const res = await syncBlablalinkProfile(cookieInput.trim(), (step, cur, total) => {
                setProgressText(step);
                setProgressPercent(Math.min(100, Math.round((cur / total) * 100)));
            });

            setResult(res);
            if (res.success) {
                const updatedOutpost = loadOutpostState();
                onSyncComplete?.(updatedOutpost);
            } else if (res.error) {
                setErrorMsg(res.error);
            }
        } catch (e: any) {
            setErrorMsg(e.message || '동기화 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const res = importProfileFromJson(json);
                if (res.success) {
                    const updatedOutpost = loadOutpostState();
                    onSyncComplete?.(updatedOutpost);
                    setResult({
                        success: true,
                        syncedCount: res.syncedCount,
                        synchroLevel: parseInt(updatedOutpost.synchroLevel, 10) || 1,
                        consoleSummary: updatedOutpost,
                        warnings: [],
                    });
                    setErrorMsg(null);
                } else {
                    setErrorMsg(res.error || '프로필 파일 적용에 실패했습니다.');
                }
            } catch (err) {
                setErrorMsg('올바른 JSON 파일이 아닙니다.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="blablalink 프로필 동기화 (내 스펙 가져오기)"
            maxWidth={560}
        >
            <div className={styles['sync-container']}>
                <div className={styles['tab-group']}>
                    <button
                        className={`${styles['tab-btn']} ${tab === 'cookie' ? styles.active : ''}`}
                        onClick={() => { setTab('cookie'); setErrorMsg(null); }}
                    >
                        blablalink 세션 쿠키로 동기화
                    </button>
                    <button
                        className={`${styles['tab-btn']} ${tab === 'file' ? styles.active : ''}`}
                        onClick={() => { setTab('file'); setErrorMsg(null); }}
                    >
                        프로필 JSON 파일 업로드
                    </button>
                </div>

                {tab === 'cookie' && (
                    <>
                        <div className={styles['guide-box']}>
                            <Font as="div" variant="caption-1" weight="bold" color="default">
                                📌 세션 쿠키 추출 방법 (최초 1회)
                            </Font>
                            <div className={styles['guide-step']}>
                                <span className={styles['step-num']}>1</span>
                                <span><a href="https://www.blablalink.com" target="_blank" rel="noreferrer" style={{ color: 'var(--Status-Info-100)', textDecoration: 'underline' }}>blablalink.com</a> 에 로그인하고 게임 계정을 연동합니다.</span>
                            </div>
                            <div className={styles['guide-step']}>
                                <span className={styles['step-num']}>2</span>
                                <span>F12 (개발자 도구) → <b>Network</b> 탭에서 <code>api.blablalink.com</code> 요청의 <b>Cookie:</b> 헤더 값을 전체 복사합니다.</span>
                            </div>
                            <div className={styles['guide-step']}>
                                <span className={styles['step-num']}>3</span>
                                <span>아래 입력창에 붙여넣고 [동기화 시작] 버튼을 누릅니다. (game_token, game_openid 포함)</span>
                            </div>
                        </div>

                        <textarea
                            className={styles['cookie-textarea']}
                            placeholder="game_token=...; game_openid=...; game_gameid=29080..."
                            value={cookieInput}
                            onChange={(e) => setCookieInput(e.target.value)}
                            disabled={isLoading}
                        />

                        <Button
                            variant="primary"
                            onClick={handleCookieSync}
                            disabled={isLoading || !cookieInput.trim()}
                        >
                            {isLoading ? '동기화 진행 중...' : 'blablalink 계정 스펙 동기화 시작'}
                        </Button>
                    </>
                )}

                {tab === 'file' && (
                    <div className={styles['file-upload-area']}>
                        <input
                            type="file"
                            id="profile-json-input"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <label htmlFor="profile-json-input" style={{ cursor: 'pointer', display: 'block' }}>
                            <Font as="div" variant="body" weight="semibold" color="default" style={{ marginBottom: '6px' }}>
                                📁 profiles/me.json 파일 선택
                            </Font>
                            <Font as="div" variant="caption-2" color="muted">
                                scraper/profile_fetch.py 로 생성된 JSON 프로필을 업로드합니다.
                            </Font>
                        </label>
                    </div>
                )}

                {isLoading && (
                    <div className={styles['progress-box']}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Font as="span" variant="caption-2" color="default">{progressText}</Font>
                            <Font as="span" variant="caption-2" weight="bold" color="muted">{progressPercent}%</Font>
                        </div>
                        <div className={styles['progress-bar-bg']}>
                            <div className={styles['progress-bar-fill']} style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                {result && result.success && (
                    <div className={styles['status-badge-success']}>
                        <Font as="div" variant="caption-1" weight="bold">
                            🎉 동기화 완료: 총 {result.syncedCount}명의 니케 육성 데이터가 저장되었습니다!
                        </Font>
                        <Font as="div" variant="footnote" color="default">
                            동기화 소대 레벨: {result.synchroLevel} | 전초기지 콘솔 레벨이 자동으로 반영되었습니다.
                        </Font>
                    </div>
                )}

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
