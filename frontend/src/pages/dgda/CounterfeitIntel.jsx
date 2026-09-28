import React, { useEffect, useRef, useState } from 'react';
import { SealWarning, Funnel, XCircle, ArrowClockwise, ImageSquare, WarningCircle, CaretDown, CaretUp } from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const REPORTS_ENDPOINT = 'core/dgda/counterfeit-reports/';
const SUMMARY_ENDPOINT = 'core/dgda/counterfeit-reports/summary/';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', variant: 'warning', color: 'var(--warning)' },
    { value: 'reviewed', label: 'Reviewed', variant: 'info', color: 'var(--info)' },
    { value: 'confirmed', label: 'Confirmed', variant: 'danger', color: 'var(--danger)' },
    { value: 'dismissed', label: 'Dismissed', variant: 'neutral', color: 'var(--text-muted)' },
];

const REASON_OPTIONS = [
    { value: 'wrong_packaging', label: 'Wrong Packaging' },
    { value: 'suspicious_price', label: 'Suspicious Price' },
    { value: 'failed_verification', label: 'Failed Verification' },
    { value: 'other', label: 'Other' },
];

const emptyFilters = { status: 'all', reason: 'all', date_from: '', date_to: '' };

const selectStyle = { width: '100%', padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.825rem' };
const cellStyle = { padding: '0.65rem 0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.825rem' };
const panelTitleStyle = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem 0' };

const statusMeta = (value) => STATUS_OPTIONS.find((option) => option.value === value) || STATUS_OPTIONS[0];

const errorText = (err, fallback) => {
    if (!err.response) return 'Unable to reach the server. Please check that the backend is running.';
    return err.response.data?.error || err.response.data?.detail || fallback;
};

const ErrorBanner = ({ message, onRetry }) => (
    <Card padding="sm" style={{ borderLeft: '4px solid var(--danger)', flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
        <WarningCircle size={20} color="var(--danger)" />
        <span style={{ flex: 1, fontSize: '0.85rem' }}>{message}</span>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><ArrowClockwise size={14} /> Retry</Button>}
    </Card>
);

const CounterfeitIntel = () => {
    const [summary, setSummary] = useState(null);
    const [summaryError, setSummaryError] = useState('');
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [filters, setFilters] = useState(emptyFilters);
    const [savingId, setSavingId] = useState(null);
    const [actionError, setActionError] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const requestIdRef = useRef(0);

    const dateRangeInvalid = Boolean(filters.date_from && filters.date_to && filters.date_from > filters.date_to);
    const filtersActive = filters.status !== 'all' || filters.reason !== 'all' || Boolean(filters.date_from) || Boolean(filters.date_to);

    const fetchSummary = async () => {
        try {
            const res = await api.get(SUMMARY_ENDPOINT);
            setSummary(res.data);
            setSummaryError('');
        } catch (err) {
            console.error('Error fetching counterfeit summary:', err);
            setSummaryError(errorText(err, 'Could not load summary statistics.'));
        }
    };

    const fetchReports = async () => {
        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        try {
            const params = {};
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.reason !== 'all') params.reason = filters.reason;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            const res = await api.get(REPORTS_ENDPOINT, { params });
            if (requestId !== requestIdRef.current) return;
            setReports(Array.isArray(res.data) ? res.data : res.data?.results || []);
            setListError('');
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            console.error('Error fetching counterfeit reports:', err);
            setReports([]);
            setListError(errorText(err, 'Could not load counterfeit reports.'));
        } finally {
            if (requestId === requestIdRef.current) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    useEffect(() => {
        if (dateRangeInvalid) return;
        fetchReports();
    }, [filters]);

    const updateFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

    const handleStatusChange = async (report, newStatus) => {
        if (newStatus === report.status) return;
        setSavingId(report.id);
        setActionError('');
        try {
            const res = await api.patch(`${REPORTS_ENDPOINT}${report.id}/`, { status: newStatus });
            // A row that no longer matches the active status filter leaves the table
            setReports((current) => (filters.status !== 'all' && res.data.status !== filters.status
                ? current.filter((item) => item.id !== report.id)
                : current.map((item) => (item.id === report.id ? res.data : item))));
            fetchSummary();
        } catch (err) {
            console.error('Error updating report status:', err);
            setActionError(`Could not update the "${report.medicine_name}" report: ${errorText(err, 'please try again.')}`);
        } finally {
            setSavingId(null);
        }
    };

    const refreshAll = () => {
        fetchSummary();
        if (!dateRangeInvalid) fetchReports();
    };

    const totalReports = summary?.total ?? 0;
    const noReportsAtAll = Boolean(summary) && totalReports === 0;
    const countForStatus = (value) => summary?.by_status?.find((row) => row.status === value)?.count ?? 0;
    const byReason = summary?.by_reason || [];
    const topMedicines = summary?.top_medicines || [];
    const overTime = summary?.over_time || [];
    const maxReasonCount = Math.max(1, ...byReason.map((row) => row.count));
    const maxDayCount = Math.max(1, ...overTime.map((row) => row.count));
    const periodTotal = overTime.reduce((sum, row) => sum + row.count, 0);

    const renderTableMessage = () => {
        if (isLoading) return 'Loading counterfeit reports...';
        if (dateRangeInvalid) return 'The "From" date is after the "To" date. Adjust the date range to see reports.';
        if (listError) return null;
        if (reports.length > 0) return null;
        if (!filtersActive && (noReportsAtAll || !summary)) return 'No counterfeit reports have been submitted yet. Reports from pharmacies and citizens will appear here.';
        return 'No reports match these filters.';
    };
    const tableMessage = renderTableMessage();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* Module header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <SealWarning size={24} color="var(--primary)" weight="duotone" /> Counterfeit Intelligence
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Review, triage and analyse suspected counterfeit medicine reports from pharmacies and citizens
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshAll}><ArrowClockwise size={14} /> Refresh</Button>
                </div>

                {summaryError && <ErrorBanner message={summaryError} onRetry={fetchSummary} />}

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', width: '100%' }}>
                    <Card padding="sm" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Reports</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalReports}</div>
                    </Card>
                    {STATUS_OPTIONS.map((option) => (
                        <Card key={option.value} padding="sm" style={{ textAlign: 'center', borderTop: `3px solid ${option.color}` }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{option.label}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: option.color }}>{countForStatus(option.value)}</div>
                        </Card>
                    ))}
                </div>

                {/* Insights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', width: '100%' }}>
                    <Card padding="md">
                        <h3 style={panelTitleStyle}>Reports by Reason</h3>
                        {noReportsAtAll || byReason.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No reports yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                {byReason.map((row) => (
                                    <div key={row.reason}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                            <span>{row.label}</span>
                                            <strong>{row.count}</strong>
                                        </div>
                                        <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                                            <div style={{ width: `${(row.count / maxReasonCount) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card padding="md">
                        <h3 style={panelTitleStyle}>Most-Reported Medicines</h3>
                        {topMedicines.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No reports yet.</p>
                        ) : (
                            <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                {topMedicines.map((row) => (
                                    <li key={row.medicine_name} style={{ fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.medicine_name}>{row.medicine_name}</span>
                                            <Badge variant={row.count > 1 ? 'danger' : 'neutral'}>{row.count}</Badge>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    <Card padding="md">
                        <h3 style={panelTitleStyle}>Reports: Last {summary?.over_time_days ?? 30} Days ({periodTotal})</h3>
                        {periodTotal === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No reports in this period.</p>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px' }}>
                                    {overTime.map((row) => (
                                        <div key={row.date} title={`${row.date}: ${row.count}`} style={{ flex: 1, height: `${Math.round((row.count / maxDayCount) * 90)}px`, minHeight: row.count ? '4px' : '1px', background: row.count ? 'var(--primary)' : 'var(--border)', borderRadius: '2px 2px 0 0' }} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    <span>{overTime[0]?.date}</span>
                                    <span>{overTime[overTime.length - 1]?.date}</span>
                                </div>
                            </>
                        )}
                    </Card>
                </div>

                {/* Filter bar */}
                <Card padding="sm" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%' }}>
                        <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status</label>
                            <select value={filters.status} onChange={updateFilter('status')} style={selectStyle}>
                                <option value="all">All Statuses</option>
                                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 150px', minWidth: '140px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reason</label>
                            <select value={filters.reason} onChange={updateFilter('reason')} style={selectStyle}>
                                <option value="all">All Reasons</option>
                                {REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>From</label>
                            <input type="date" value={filters.date_from} max={filters.date_to || undefined} onChange={updateFilter('date_from')} style={selectStyle} />
                        </div>
                        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>To</label>
                            <input type="date" value={filters.date_to} min={filters.date_from || undefined} onChange={updateFilter('date_to')} style={selectStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <Button type="button" variant="outline" size="sm" style={{ padding: '0.45rem 0.65rem', fontSize: '0.825rem' }} onClick={() => setFilters(emptyFilters)} disabled={!filtersActive}>
                                <XCircle size={14} /> Clear
                            </Button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', paddingBottom: '0.5rem' }}>
                            <Funnel size={14} /> {isLoading ? '…' : `${reports.length} shown`}
                        </div>
                    </div>
                </Card>

                {actionError && <ErrorBanner message={actionError} />}
                {listError && !isLoading && <ErrorBanner message={listError} onRetry={fetchReports} />}

                {/* Reports table */}
                <Card padding="none" style={{ width: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ ...cellStyle, width: '11%', fontWeight: 600 }}>Reported</th>
                                    <th style={{ ...cellStyle, width: '18%', fontWeight: 600 }}>Medicine</th>
                                    <th style={{ ...cellStyle, width: '15%', fontWeight: 600 }}>Reason</th>
                                    <th style={{ ...cellStyle, width: '16%', fontWeight: 600 }}>Location</th>
                                    <th style={{ ...cellStyle, width: '16%', fontWeight: 600 }}>Reporter</th>
                                    <th style={{ ...cellStyle, width: '14%', fontWeight: 600 }}>Status</th>
                                    <th style={{ ...cellStyle, width: '10%', textAlign: 'right', fontWeight: 600 }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableMessage ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'normal' }}>
                                            <div>{tableMessage}</div>
                                            {!isLoading && filtersActive && reports.length === 0 && (
                                                <Button variant="outline" size="sm" style={{ marginTop: '0.75rem' }} onClick={() => setFilters(emptyFilters)}>
                                                    <XCircle size={14} /> Clear filters
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ) : reports.map((report) => {
                                    const meta = statusMeta(report.status);
                                    const isExpanded = expandedId === report.id;
                                    return (
                                        <React.Fragment key={report.id}>
                                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
                                                <td style={{ ...cellStyle, color: 'var(--text-muted)' }} title={new Date(report.created_at).toLocaleString()}>
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ ...cellStyle, fontWeight: 600 }} title={report.medicine_name}>{report.medicine_name}</td>
                                                <td style={cellStyle} title={report.reason_display}>{report.reason_display}</td>
                                                <td style={{ ...cellStyle, color: 'var(--text-muted)' }} title={report.location || ''}>{report.location || '—'}</td>
                                                <td style={cellStyle} title={`${report.reporter_username} (${report.reporter_role})`}>
                                                    {report.reporter_username}{' '}
                                                    <Badge variant={report.reporter_role === 'pharmacy' ? 'info' : 'neutral'} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>{report.reporter_role}</Badge>
                                                </td>
                                                <td style={cellStyle}>
                                                    <select
                                                        value={report.status}
                                                        disabled={savingId === report.id}
                                                        onChange={(event) => handleStatusChange(report, event.target.value)}
                                                        aria-label={`Status for ${report.medicine_name} report`}
                                                        style={{ ...selectStyle, padding: '0.3rem 0.4rem', fontWeight: 600, color: meta.color, borderColor: meta.color }}
                                                    >
                                                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ ...cellStyle, textAlign: 'right' }}>
                                                    <Button variant="ghost" size="sm" style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }} onClick={() => setExpandedId(isExpanded ? null : report.id)} aria-expanded={isExpanded}>
                                                        {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />} {isExpanded ? 'Hide' : 'View'}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                                                    <td colSpan="7" style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ whiteSpace: 'pre-wrap' }}>{report.description}</div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                                <span>QR code: <strong style={{ color: 'var(--text-main)' }}>{report.qr_code || 'Not provided'}</strong></span>
                                                                <span>Submitted: {new Date(report.created_at).toLocaleString()}</span>
                                                                <Badge variant={meta.variant}>{report.status_display}</Badge>
                                                                {report.photo ? (
                                                                    <a href={report.photo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        <ImageSquare size={14} /> View photo evidence
                                                                    </a>
                                                                ) : <span>No photo attached</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default CounterfeitIntel;
