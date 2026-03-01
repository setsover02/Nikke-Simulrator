import React from 'react';
import CanvasChart from './CanvasChart';

interface Props {
    noCoreDatasets: any[];
    withCoreDatasets: any[];
}

const DualChart: React.FC<Props> = ({ noCoreDatasets, withCoreDatasets }) => {
    if (noCoreDatasets.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
            {/* 코어 없는 적 차트 */}
            <div style={{ flex: '1', minWidth: '360px' }}>
                <h3 style={{ color: '#aaa', marginBottom: '4px', fontSize: '15px' }}>🔵 코어 없는 적</h3>
                <p style={{ color: '#555', fontSize: '11px', marginTop: 0, marginBottom: '8px' }}>코어 히트 없음</p>
                <CanvasChart datasets={noCoreDatasets} />
            </div>
            {/* 코어 있는 적 차트 */}
            <div style={{ flex: '1', minWidth: '360px' }}>
                <h3 style={{ color: '#ffd700', marginBottom: '4px', fontSize: '15px' }}>🟡 코어 있는 적</h3>
                <p style={{ color: '#555', fontSize: '11px', marginTop: 0, marginBottom: '8px' }}>명중률 기반 확률적 코어 명중</p>
                <CanvasChart datasets={withCoreDatasets} />
            </div>
        </div>
    );
};

export default DualChart;
