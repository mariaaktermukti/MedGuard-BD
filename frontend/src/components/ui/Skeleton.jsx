import React from 'react';

// Single Skeleton Block with Emerald Shimmer Animation
export const Skeleton = ({ height = '20px', width = '100%', borderRadius = '8px', className = '', style = {} }) => {
    return (
        <div 
            className={`skeleton-shimmer ${className}`}
            style={{
                height,
                width,
                borderRadius,
                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite ease-in-out',
                ...style
            }} 
        />
    );
};

// 1. Dashboard Skeleton Placeholder
export const DashboardSkeleton = () => {
    return (
        <div style={{ paddingBottom: '2rem', width: '100%' }}>
            {/* Header Skeleton */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Skeleton height="36px" width="280px" borderRadius="10px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="28px" width="180px" borderRadius="20px" />
                </div>
            </div>

            {/* 4 Stat Cards Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Skeleton height="48px" width="48px" borderRadius="50%" />
                        <div style={{ flex: 1 }}>
                            <Skeleton height="28px" width="60%" borderRadius="6px" style={{ marginBottom: '0.4rem' }} />
                            <Skeleton height="16px" width="80%" borderRadius="4px" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Two Column Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <Skeleton height="24px" width="160px" borderRadius="6px" style={{ marginBottom: '1rem' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} height="90px" width="100%" borderRadius="12px" />
                        ))}
                    </div>

                    <Skeleton height="24px" width="180px" borderRadius="6px" style={{ marginBottom: '1rem' }} />
                    <Skeleton height="220px" width="100%" borderRadius="16px" />
                </div>

                <div>
                    <Skeleton height="180px" width="100%" borderRadius="16px" style={{ marginBottom: '1.5rem' }} />
                    <Skeleton height="160px" width="100%" borderRadius="16px" />
                </div>
            </div>
        </div>
    );
};

// 2. Medicine Cards List Skeleton Placeholder
export const MedicineListSkeleton = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Skeleton height="32px" width="260px" borderRadius="8px" style={{ marginBottom: '0.4rem' }} />
                    <Skeleton height="18px" width="200px" borderRadius="4px" />
                </div>
                <Skeleton height="20px" width="90px" borderRadius="4px" />
            </div>

            <Skeleton height="46px" width="100%" borderRadius="12px" style={{ marginBottom: '1.5rem' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 280px' }}>
                            <Skeleton height="48px" width="48px" borderRadius="12px" />
                            <div style={{ flex: 1 }}>
                                <Skeleton height="22px" width="65%" borderRadius="6px" style={{ marginBottom: '0.4rem' }} />
                                <Skeleton height="16px" width="85%" borderRadius="4px" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Skeleton height="34px" width="90px" borderRadius="20px" />
                            <Skeleton height="34px" width="34px" borderRadius="8px" />
                            <Skeleton height="34px" width="100px" borderRadius="8px" />
                            <Skeleton height="34px" width="34px" borderRadius="8px" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 3. Notifications List Skeleton Placeholder
export const NotificationListSkeleton = () => {
    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Skeleton height="32px" width="200px" borderRadius="8px" />
                <Skeleton height="26px" width="110px" borderRadius="20px" />
            </div>

            <Skeleton height="44px" width="100%" borderRadius="12px" style={{ marginBottom: '1.5rem' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '14px', display: 'flex', gap: '1rem' }}>
                        <Skeleton height="42px" width="42px" borderRadius="12px" />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <Skeleton height="20px" width="60%" borderRadius="6px" />
                                <Skeleton height="14px" width="80px" borderRadius="4px" />
                            </div>
                            <Skeleton height="16px" width="90%" borderRadius="4px" style={{ marginBottom: '0.4rem' }} />
                            <Skeleton height="20px" width="130px" borderRadius="8px" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Skeleton;
