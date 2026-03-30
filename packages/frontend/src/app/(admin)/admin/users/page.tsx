'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

interface AdminUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  studentType?: string;
  penaltyScore: number;
  isSuspended: boolean;
  createdAt: string;
}

interface StartupClub {
  approvalId: string;
  userId: string;
  userName: string;
  userEmail: string;
  clubName: string;
  status: string;
}

type SortField = 'name' | 'email' | 'role' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [clubs, setClubs] = useState<StartupClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  const [penaltyModal, setPenaltyModal] = useState<AdminUser | null>(null);
  const [penaltyScore, setPenaltyScore] = useState(0);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [penaltyLoading, setPenaltyLoading] = useState(false);

  const [roleModal, setRoleModal] = useState(false);
  const [bulkRole, setBulkRole] = useState('GENERAL');
  const [bulkStudentType, setBulkStudentType] = useState('NORMAL');
  const [bulkClubName, setBulkClubName] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort: sortField, order: sortOrder };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const data = await adminApi.getUsers(params);
      setUsers((data as any).items ?? []);
      setTotal((data as any).total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, sortField, sortOrder]);

  const fetchClubs = useCallback(async () => {
    setClubsLoading(true);
    try {
      const data = await adminApi.getStartupClubs();
      setClubs((data as any).items ?? (data as any) ?? []);
    } catch {
      setClubs([]);
    } finally {
      setClubsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  // ─── 정렬 ───
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  // ─── 선택 ───
  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.userId)));
    }
  };

  const selectedCount = selectedIds.size;

  // ─── 일괄 삭제 ───
  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selectedCount}명의 사용자를 삭제하시겠습니까?\n(관리자 계정은 제외됩니다)`)) return;
    setBulkLoading(true);
    try {
      const data = await adminApi.bulkDeleteUsers(Array.from(selectedIds));
      setMessage({ type: 'success', text: `${(data as any).deletedCount}명이 삭제되었습니다.` });
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '삭제에 실패했습니다.' });
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── 일괄 역할 변경 ───
  const handleBulkRoleChange = async () => {
    setBulkLoading(true);
    try {
      const payload: any = { userIds: Array.from(selectedIds), role: bulkRole };
      if (bulkRole === 'STUDENT') {
        payload.studentType = bulkStudentType;
        if (bulkStudentType === 'STARTUP_CLUB') payload.clubName = bulkClubName;
      }
      const data = await adminApi.bulkChangeRole(payload);
      setMessage({ type: 'success', text: `${(data as any).updatedCount}명의 역할이 변경되었습니다.` });
      setRoleModal(false);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '역할 변경에 실패했습니다.' });
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── 일괄 이메일 발송 ───
  const handleBulkEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setEmailLoading(true);
    try {
      const data = await adminApi.bulkSendEmail({
        userIds: Array.from(selectedIds),
        subject: emailSubject,
        body: emailBody,
      });
      setMessage({ type: 'success', text: `${(data as any).sentCount}/${(data as any).totalRecipients}명에게 이메일이 발송되었습니다.` });
      setEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '이메일 발송에 실패했습니다.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // ─── 기존 기능들 ───
  const handlePenaltyAdjust = async () => {
    if (!penaltyModal || !penaltyReason.trim()) return;
    setPenaltyLoading(true);
    try {
      await adminApi.adjustPenalty(penaltyModal.userId, { score: penaltyScore, reason: penaltyReason });
      setMessage({ type: 'success', text: `${penaltyModal.name}님의 패널티가 조정되었습니다.` });
      setPenaltyModal(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '패널티 조정에 실패했습니다.' });
    } finally {
      setPenaltyLoading(false);
    }
  };

  const handleGrantAdmin = async (userId: string, name: string) => {
    if (!confirm(`${name}님에게 관리자 권한을 부여하시겠습니까?`)) return;
    try {
      await adminApi.grantAdmin(userId);
      setMessage({ type: 'success', text: `${name}님에게 관리자 권한이 부여되었습니다.` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '관리자 권한 부여에 실패했습니다.' });
    }
  };

  const handleClubAction = async (approvalId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await adminApi.processStartupClub(approvalId, { action });
      setMessage({ type: 'success', text: action === 'APPROVE' ? '승인되었습니다.' : '반려되었습니다.' });
      fetchClubs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '처리에 실패했습니다.' });
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return '관리자';
      case 'STUDENT': return '학생';
      case 'GENERAL': return '일반인';
      default: return role;
    }
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return styles.roleAdmin;
      case 'STUDENT': return styles.roleStudent;
      default: return styles.roleGeneral;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pendingClubs = clubs.filter(c => c.status === 'PENDING');

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>사용자 관리</h1>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Startup Club Approvals */}
      {pendingClubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>창업동아리 승인 대기 ({pendingClubs.length}건)</h2>
          {pendingClubs.map(club => (
            <div key={club.approvalId} className={styles.clubItem}>
              <div className={styles.clubInfo}>
                <span className={styles.clubName}>{club.clubName}</span>
                <span className={styles.clubUser}>{club.userName} ({club.userEmail})</span>
              </div>
              <div className={styles.clubActions}>
                <Button size="sm" onClick={() => handleClubAction(club.approvalId, 'APPROVE')}>승인</Button>
                <Button size="sm" variant="danger" onClick={() => handleClubAction(club.approvalId, 'REJECT')}>반려</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User List */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>사용자 목록</h2>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>검색</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="이름 또는 이메일"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>역할</label>
            <select
              className={styles.filterInput}
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="">전체</option>
              <option value="STUDENT">학생</option>
              <option value="GENERAL">일반인</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>
          <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}>
            초기화
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{selectedCount}명 선택됨</span>
            <Button size="sm" variant="danger" onClick={handleBulkDelete} loading={bulkLoading}>
              선택 삭제
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setRoleModal(true); setBulkRole('GENERAL'); }}>
              역할 변경
            </Button>
            <Button size="sm" onClick={() => { setEmailModal(true); setEmailSubject(''); setEmailBody(''); }}>
              이메일 발송
            </Button>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className={styles.sortable} onClick={() => handleSort('name')}>
                  이름{sortIcon('name')}
                </th>
                <th className={styles.sortable} onClick={() => handleSort('email')}>
                  이메일{sortIcon('email')}
                </th>
                <th className={styles.sortable} onClick={() => handleSort('role')}>
                  역할{sortIcon('role')}
                </th>
                <th>패널티</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.emptyRow}>로딩 중...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyRow}>사용자가 없습니다.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.userId} className={selectedIds.has(user.userId) ? styles.selectedRow : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.userId)}
                        onChange={() => toggleSelect(user.userId)}
                      />
                    </td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${roleBadgeClass(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={user.penaltyScore >= 3 ? styles.penaltyHigh : ''}>
                        {user.penaltyScore}점
                      </span>
                    </td>
                    <td>
                      {user.isSuspended ? (
                        <span className={styles.suspended}>정지</span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>정상</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button size="sm" variant="secondary" onClick={() => { setPenaltyModal(user); setPenaltyScore(0); setPenaltyReason(''); }}>
                          패널티
                        </Button>
                        {user.role !== 'ADMIN' && (
                          <Button size="sm" variant="secondary" onClick={() => handleGrantAdmin(user.userId, user.name)}>
                            관리자
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page <= 1} type="button">이전</button>
            <span className={styles.pageInfo}>{page} / {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} type="button">다음</button>
          </div>
        )}
      </div>

      {/* Penalty Modal */}
      {penaltyModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setPenaltyModal(null); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>패널티 조정 - {penaltyModal.name}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 12 }}>
              현재 패널티: {penaltyModal.penaltyScore}점
            </p>
            <div className={styles.modalField}>
              <label className={styles.modalFieldLabel}>새 점수</label>
              <input type="number" className={styles.modalInput} value={penaltyScore} onChange={e => setPenaltyScore(Number(e.target.value))} />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalFieldLabel}>사유</label>
              <textarea className={styles.modalTextarea} placeholder="조정 사유를 입력하세요" value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setPenaltyModal(null)} disabled={penaltyLoading}>취소</Button>
              <Button onClick={handlePenaltyAdjust} loading={penaltyLoading} disabled={!penaltyReason.trim()}>조정 확인</Button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setRoleModal(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>역할 일괄 변경 ({selectedCount}명)</h3>
            <div className={styles.modalField}>
              <label className={styles.modalFieldLabel}>변경할 역할</label>
              <select className={styles.modalInput} value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                <option value="GENERAL">일반인</option>
                <option value="STUDENT">학생</option>
                <option value="ADMIN">관리자</option>
              </select>
            </div>
            {bulkRole === 'STUDENT' && (
              <>
                <div className={styles.modalField}>
                  <label className={styles.modalFieldLabel}>학생 유형</label>
                  <select className={styles.modalInput} value={bulkStudentType} onChange={e => setBulkStudentType(e.target.value)}>
                    <option value="NORMAL">일반 학생</option>
                    <option value="STARTUP_CLUB">창업동아리</option>
                  </select>
                </div>
                {bulkStudentType === 'STARTUP_CLUB' && (
                  <div className={styles.modalField}>
                    <label className={styles.modalFieldLabel}>동아리명</label>
                    <input type="text" className={styles.modalInput} value={bulkClubName} onChange={e => setBulkClubName(e.target.value)} placeholder="동아리명 입력" />
                  </div>
                )}
              </>
            )}
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setRoleModal(false)} disabled={bulkLoading}>취소</Button>
              <Button onClick={handleBulkRoleChange} loading={bulkLoading}>변경 확인</Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setEmailModal(false); }}>
          <div className={styles.modal} style={{ maxWidth: 560 }}>
            <h3 className={styles.modalTitle}>이메일 발송 ({selectedCount}명)</h3>
            <div className={styles.modalField}>
              <label className={styles.modalFieldLabel}>제목</label>
              <input type="text" className={styles.modalInput} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="이메일 제목" />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalFieldLabel}>내용</label>
              <textarea
                className={styles.modalTextarea}
                style={{ minHeight: 160 }}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="이메일 내용을 입력하세요"
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setEmailModal(false)} disabled={emailLoading}>취소</Button>
              <Button onClick={handleBulkEmail} loading={emailLoading} disabled={!emailSubject.trim() || !emailBody.trim()}>
                발송
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
