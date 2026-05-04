/* ============================
   CONFIG & STATE
============================ */
const API_BASE = 'http://localhost:3000';

const state = {
    token: localStorage.getItem('access_token') || null,
    user: null,
    jobs: { data: [], page: 1, total: 0, limit: 10 },
    schedules: { data: [], page: 1 },
    webhooks: { data: [] },
    audit: { data: [], page: 1, total: 0, limit: 20 },
};

/* ============================
   API HELPERS
============================ */
async function api(method, path, body = null, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));

    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });

    // Nếu 401 và KHÔNG phải đang gọi /auth/refresh (tránh loop)
    if (res.status === 401 && path !== '/auth/refresh') {
        const refreshed = await tryRefreshToken();
        if (!refreshed) { handleLogout(); return null; }

        // Retry request gốc với token mới
        headers['Authorization'] = `Bearer ${state.token}`;
        const retryRes = await fetch(url.toString(), {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        });
        if (!retryRes.ok) {
            if (retryRes.status === 401) { handleLogout(); return null; }
            const errData = await retryRes.json().catch(() => ({ message: 'Lỗi không xác định' }));
            throw new Error(errData.message || `HTTP ${retryRes.status}`);
        }
        return retryRes.json().catch(() => ({}));
    }

    if (res.status === 401) { handleLogout(); return null; }

    if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        throw new Error(errData.message || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
}

async function tryRefreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const res = await fetch(API_BASE + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;

        const data = await res.json();
        state.token = data.accessToken;
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

/* ============================
   AUTH LOGIC
============================ */
function switchPanel(panel) {
    document.getElementById('login-panel').classList.toggle('hidden', panel !== 'login');
    document.getElementById('register-panel').classList.toggle('hidden', panel !== 'register');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('reg-error').classList.add('hidden');
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');

    if (!email || !password) {
        showFormError('login-error', 'Vui lòng nhập đầy đủ email và mật khẩu.');
        return;
    }

    try {
        const data = await api('POST', '/auth/login', { email, password });
        if (!data) return;

        // Lưu tokens
        state.token = data.accessToken;
        localStorage.setItem('access_token', state.token);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);

        // Lấy user trực tiếp từ response, không cần gọi /auth/me nữa
        if (data.user) {
            state.user = data.user;
            localStorage.setItem('current_user', JSON.stringify(data.user)); // thêm dòng này
            document.getElementById('user-email-display').textContent = data.user.email;
            document.getElementById('user-role-display').textContent = data.user.role;
            document.getElementById('user-avatar').textContent = data.user.email[0].toUpperCase();
        }

        showApp();
        showToast('Đăng nhập thành công!', 'success');

        // Reset về tab Jobs và load data SAU khi màn hình đã hiện
        const firstTabBtn = document.querySelector('.nav-item');
        if (firstTabBtn) switchTab('jobs', firstTabBtn);
    } catch (e) {
        showFormError('login-error', e.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
}

async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!email || !password || !confirm) {
        showFormError('reg-error', 'Vui lòng điền đầy đủ thông tin.'); return;
    }
    if (password.length < 8) {
        showFormError('reg-error', 'Mật khẩu phải có ít nhất 8 ký tự.'); return;
    }
    if (password !== confirm) {
        showFormError('reg-error', 'Mật khẩu xác nhận không khớp.'); return;
    }

    try {
        await api('POST', '/auth/register', { email, password });
        showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        switchPanel('login');
        document.getElementById('login-email').value = email;
    } catch (e) {
        showFormError('reg-error', e.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
}

async function loadUser() {
    const stored = localStorage.getItem('current_user');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            state.user = user;
            document.getElementById('user-email-display').textContent = user.email;
            document.getElementById('user-role-display').textContent = user.role;
            document.getElementById('user-avatar').textContent = user.email[0].toUpperCase();
        } catch {
            localStorage.removeItem('current_user');
        }
    }
}

async function handleLogout() {
    try { await api('POST', '/auth/logout'); } catch (_) { }
    state.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token'); // thêm dòng này
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-overlay').classList.remove('hidden');
    localStorage.removeItem('current_user');
    showToast('Đã đăng xuất.', 'info');
}

function showFormError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
}

function showApp() {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    //fetchJobs();
}

/* ============================
   TAB NAVIGATION
============================ */
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    btn.classList.add('active');

    const loaders = {
        jobs: fetchJobs,
        schedules: fetchSchedules,
        webhooks: fetchWebhooks,
        audit: fetchAuditLogs,
    };
    loaders[tab] && loaders[tab]();
}

/* ============================
   JOBS
============================ */
async function fetchJobs() {
    const status = document.getElementById('filter-job-status').value;
    const type = document.getElementById('filter-job-type').value;
    setLoading('jobs-tbody', 8);
    try {
        const data = await api('GET', '/job', null, {
            status, type,
            page: state.jobs.page,
            limit: state.jobs.limit,
        });
        if (!data) return;
        state.jobs.data = data.jobs || data.data || data || [];
        state.jobs.total = data.total || state.jobs.data.length;
        renderJobsTable();
    } catch (e) {
        showTableError('jobs-tbody', 8, e.message);
    }
}

function renderJobsTable() {
    const tbody = document.getElementById('jobs-tbody');
    const statusFilter = document.getElementById('filter-job-status').value;
    const typeFilter = document.getElementById('filter-job-type').value;

    let rows = state.jobs.data;
    if (statusFilter) rows = rows.filter(j => j.status === statusFilter);
    if (typeFilter) rows = rows.filter(j => j.type === typeFilter);

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Không có dữ liệu</td></tr>`;
        document.getElementById('jobs-pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = rows.map(job => `
    <tr>
      <td><span class="id-cell">${shortId(job.id)}</span></td>
      <td><span class="type-chip">${job.type}</span></td>
      <td>${statusBadge(job.status)}</td>
      <td>${renderPayloadCompact(job.payload, job.type, job.id)}</td>
      <td><span style="font-family:var(--font-mono);font-weight:600;color:var(--accent)">${job.priority ?? 5}</span></td>
      <td>
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">
          ${job.attempts ?? 0}/${job.maxAttempts ?? 3}
        </span>
      </td>
      <td>${renderDate(job.createdAt)}</td>
      <td>
        <div class="action-group">
          <button class="btn-icon" onclick="showJobDetail('${job.id}')" title="Xem chi tiết">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          ${job.status === 'FAILED' ? `<button class="btn-icon" onclick="retryJob('${job.id}')" title="Thử lại">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          </button>` : ''}
          ${['PENDING', 'ACTIVE'].includes(job.status) ? `<button class="btn-icon" onclick="cancelJob('${job.id}')" title="Huỷ job" style="color:var(--danger)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

    renderPagination('jobs-pagination', state.jobs.page, Math.ceil(state.jobs.total / state.jobs.limit), (p) => {
        state.jobs.page = p; fetchJobs();
    });
}

async function retryJob(id) {
    try {
        await api('POST', `/job/${id}/retry`);
        showToast('Đã retry job thành công.', 'success');
        fetchJobs();
    } catch (e) { showToast(e.message, 'error'); }
}

async function cancelJob(id) {
    if (!confirm('Bạn có chắc muốn huỷ job này?')) return;
    try {
        await api('DELETE', `/job/${id}`);
        showToast('Đã huỷ job.', 'info');
        fetchJobs();
    } catch (e) { showToast(e.message, 'error'); }
}

function showJobDetail(id) {
    const job = state.jobs.data.find(j => j.id === id);
    if (!job) return;

    document.getElementById('detail-modal-title').textContent = `Chi tiết Job — ${job.type}`;
    document.getElementById('detail-modal-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Thông tin cơ bản</div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">ID</span>
          <span class="detail-value mono">${job.id}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Trạng thái</span>
          <span class="detail-value">${statusBadge(job.status)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Loại</span>
          <span class="detail-value"><span class="type-chip">${job.type}</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Ưu tiên</span>
          <span class="detail-value mono">${job.priority}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Số lần thử</span>
          <span class="detail-value mono">${job.attempts} / ${job.maxAttempts}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Tạo lúc</span>
          <span class="detail-value">${formatDateFull(job.createdAt)}</span>
        </div>
        ${job.startedAt ? `<div class="detail-item"><span class="detail-label">Bắt đầu</span><span class="detail-value">${formatDateFull(job.startedAt)}</span></div>` : ''}
        ${job.completedAt ? `<div class="detail-item"><span class="detail-label">Hoàn thành</span><span class="detail-value">${formatDateFull(job.completedAt)}</span></div>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Payload</div>
      ${renderPayloadTable(job.payload)}
    </div>

    ${job.error ? `
    <div class="detail-section">
      <div class="detail-section-title">Lỗi</div>
      <div class="detail-value mono" style="color:var(--danger)">${job.error}</div>
    </div>` : ''}

    ${job.result ? `
    <div class="detail-section">
      <div class="detail-section-title">Kết quả</div>
      ${renderPayloadTable(job.result)}
    </div>` : ''}
  `;
    openModal('modal-detail');
}

/* ============================
   CREATE JOB MODAL
============================ */
const PAYLOAD_FIELDS = {
    SEND_EMAIL: [
        { key: 'to', label: 'Địa chỉ nhận', type: 'email', placeholder: 'recipient@example.com' },
        { key: 'subject', label: 'Tiêu đề', type: 'text', placeholder: 'Tiêu đề email' },
        { key: 'body', label: 'Nội dung', type: 'textarea', placeholder: 'Nội dung email...' },
    ],
    SEND_SMS: [
        { key: 'to', label: 'Số điện thoại', type: 'text', placeholder: '+84901234567' },
        { key: 'message', label: 'Tin nhắn', type: 'textarea', placeholder: 'Nội dung tin nhắn...' },
    ],
    RESIZE_IMAGE: [
        { key: 'imageUrl', label: 'URL ảnh', type: 'url', placeholder: 'https://example.com/image.jpg' },
        { key: 'width', label: 'Chiều rộng (px)', type: 'number', placeholder: '800' },
        { key: 'height', label: 'Chiều cao (px)', type: 'number', placeholder: '600' },
        { key: 'format', label: 'Định dạng', type: 'select', options: ['jpeg', 'png', 'webp'] },
    ],
    COMPRESS_VIDEO: [
        { key: 'videoUrl', label: 'URL video', type: 'url', placeholder: 'https://example.com/video.mp4' },
        { key: 'quality', label: 'Chất lượng (1-100)', type: 'number', placeholder: '80' },
    ],
    GENERATE_PDF: [
        { key: 'templateId', label: 'Template ID', type: 'text', placeholder: 'invoice-template-v1' },
        { key: 'data', label: 'Dữ liệu (JSON)', type: 'textarea', placeholder: '{"customer": "Nguyễn Văn A"}' },
    ],
    EXPORT_CSV: [
        { key: 'filename', label: 'Tên file', type: 'text', placeholder: 'export_2025.csv' },
        { key: 'query', label: 'Query (tuỳ chọn)', type: 'text', placeholder: 'SELECT * FROM orders' },
        { key: 'data', label: 'Dữ liệu (JSON array)', type: 'textarea', placeholder: '[{"id":1,"name":"A"}]' },
    ],
    CALL_WEBHOOK: [
        { key: 'url', label: 'URL', type: 'url', placeholder: 'https://api.example.com/endpoint' },
        { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { key: 'headers', label: 'Headers (JSON, tuỳ chọn)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}' },
        { key: 'body', label: 'Body (JSON, tuỳ chọn)', type: 'textarea', placeholder: '{"key": "value"}' },
    ],
};

function renderPayloadForm() {
    const type = document.getElementById('new-job-type').value;
    const fields = PAYLOAD_FIELDS[type] || [];
    const container = document.getElementById('payload-form-container');

    container.innerHTML = `<div class="payload-form-title">Payload — ${type}</div>` + fields.map(f => {
        if (f.type === 'select') {
            return `<div class="form-group">
        <label>${f.label}</label>
        <select id="pf-${f.key}">${f.options.map(o => `<option>${o}</option>`).join('')}</select>
      </div>`;
        }
        if (f.type === 'textarea') {
            return `<div class="form-group">
        <label>${f.label}</label>
        <textarea id="pf-${f.key}" rows="3">${f.placeholder || ''}</textarea>
    </div>`;
        }
        return `<div class="form-group">
      <label>${f.label}</label>
      <input type="${f.type}" id="pf-${f.key}" placeholder="${f.placeholder}" />
    </div>`;
    }).join('');
}

function openCreateJobModal() {
    renderPayloadForm();
    openModal('modal-create-job');
}

async function submitCreateJob() {
    const type = document.getElementById('new-job-type').value;
    const priority = parseInt(document.getElementById('new-job-priority').value) || 5;
    const maxAttempts = parseInt(document.getElementById('new-job-max-attempts').value) || 3;
    const delay = parseInt(document.getElementById('new-job-delay').value) || 0;
    const fields = PAYLOAD_FIELDS[type] || [];

    const payload = {};
    for (const f of fields) {
        const el = document.getElementById(`pf-${f.key}`);
        if (!el) continue;
        const val = el.value.trim();
        if (!val) continue;
        if (f.type === 'number') { payload[f.key] = Number(val); continue; }
        if (f.type === 'textarea' && f.key !== 'body' && f.key !== 'message') {
            try { payload[f.key] = JSON.parse(val); } catch { payload[f.key] = val; }
        } else {
            payload[f.key] = val;
        }
    }

    try {
        await api('POST', '/job', { type, payload, priority, delay, maxAttempts });
        closeModal('modal-create-job');
        showToast('Tạo job thành công!', 'success');
        fetchJobs();
    } catch (e) { showToast(e.message, 'error'); }
}

/* ============================
   SCHEDULES
============================ */
async function fetchSchedules() {
    setLoading('schedules-tbody', 8);
    try {
        const data = await api('GET', '/schedule/schedules');
        state.schedules.data = data?.schedules || data?.data || data || [];
        renderSchedulesTable();
    } catch (e) { showTableError('schedules-tbody', 8, e.message); }
}

function renderSchedulesTable() {
    const tbody = document.getElementById('schedules-tbody');
    const rows = state.schedules.data;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Chưa có schedule nào</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(s => `
    <tr>
      <td><strong style="color:var(--text-primary)">${escHtml(s.name)}</strong></td>
      <td><span class="type-chip">${s.jobType}</span></td>
      <td><code class="cron-expr">${escHtml(s.cronExpr)}</code></td>
      <td>${renderPayloadCompact(s.payload, s.jobType, s.id)}</td>
      <td><span class="badge ${s.isActive ? 'badge-on' : 'badge-off'}">${s.isActive ? 'Bật' : 'Tắt'}</span></td>
      <td>${s.lastRunAt ? renderDate(s.lastRunAt) : '<span style="color:var(--text-muted);font-size:12px">Chưa chạy</span>'}</td>
      <td>${s.nextRunAt ? renderDate(s.nextRunAt) : '<span style="color:var(--text-muted);font-size:12px">—</span>'}</td>
      <td>
        <div class="action-group">
          <button class="btn-icon" onclick="toggleSchedule('${s.id}')" title="${s.isActive ? 'Tắt' : 'Bật'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64A9 9 0 015.64 19.36"/><path d="M5.64 6.64A9 9 0 0118.36 19.36"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-danger" onclick="deleteSchedule('${s.id}')">Xoá</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function toggleSchedule(id) {
    try {
        await api('PATCH', `/schedule/schedules/${id}/toggle`);
        showToast('Đã cập nhật trạng thái schedule.', 'success');
        fetchSchedules();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteSchedule(id) {
    if (!confirm('Xoá schedule này?')) return;
    try {
        await api('DELETE', `/schedule/schedules/${id}`);
        showToast('Đã xoá schedule.', 'info');
        fetchSchedules();
    } catch (e) { showToast(e.message, 'error'); }
}

function renderSchedulePayloadForm() {
    const type = document.getElementById('new-schedule-type').value;
    const fields = PAYLOAD_FIELDS[type] || [];
    const container = document.getElementById('schedule-payload-form-container');

    if (!fields.length) {
        container.innerHTML = `<div class="form-group">
            <label>Payload (JSON)</label>
            <textarea id="new-schedule-payload" rows="4" placeholder='{"key": "value"}'></textarea>
        </div>`;
        return;
    }

    container.innerHTML = `<div class="payload-form-title">Payload — ${type}</div>` + fields.map(f => {
        if (f.type === 'select') {
            return `<div class="form-group">
                <label>${f.label}</label>
                <select id="spf-${f.key}">${f.options.map(o => `<option>${o}</option>`).join('')}</select>
            </div>`;
        }
        if (f.type === 'textarea') {
            return `<div class="form-group">
                <label>${f.label}</label>
                <textarea id="spf-${f.key}" rows="3" placeholder="${f.placeholder}"></textarea>
            </div>`;
        }
        return `<div class="form-group">
            <label>${f.label}</label>
            <input type="${f.type}" id="spf-${f.key}" placeholder="${f.placeholder}" />
        </div>`;
    }).join('');
}

function openCreateScheduleModal() {
    renderSchedulePayloadForm(); // render form payload ngay khi mở
    openModal('modal-create-schedule');
}

function setCron(expr) {
    document.getElementById('new-schedule-cron').value = expr;
}

async function submitCreateSchedule() {
    const name = document.getElementById('new-schedule-name').value.trim();
    const jobType = document.getElementById('new-schedule-type').value;
    const cronExpr = document.getElementById('new-schedule-cron').value.trim();

    if (!name || !cronExpr) { showToast('Vui lòng điền tên và cron expression.', 'error'); return; }

    // Build payload từ form động (giống submitCreateJob)
    const fields = PAYLOAD_FIELDS[jobType] || [];
    let payload = {};

    if (fields.length) {
        for (const f of fields) {
            const el = document.getElementById(`spf-${f.key}`);
            if (!el) continue;
            const val = el.value.trim();
            if (!val) continue;
            if (f.type === 'number') { payload[f.key] = Number(val); continue; }
            if (f.type === 'textarea' && f.key !== 'body' && f.key !== 'message') {
                try { payload[f.key] = JSON.parse(val); } catch { payload[f.key] = val; }
            } else {
                payload[f.key] = val;
            }
        }
    } else {
        // Fallback textarea JSON nếu không có PAYLOAD_FIELDS cho type này
        const raw = document.getElementById('new-schedule-payload')?.value.trim();
        try { payload = raw ? JSON.parse(raw) : {}; }
        catch { showToast('Payload không phải JSON hợp lệ.', 'error'); return; }
    }

    try {
        await api('POST', '/schedule/schedules', { name, jobType, cronExpr, payload });
        closeModal('modal-create-schedule');
        showToast('Tạo schedule thành công!', 'success');
        fetchSchedules();
    } catch (e) { showToast(e.message, 'error'); }
}

/* ============================
   WEBHOOKS
============================ */
async function fetchWebhooks() {
    setLoading('webhooks-tbody', 5);
    try {
        const data = await api('GET', '/webhook');
        state.webhooks.data = data?.webhooks || data?.data || data || [];
        renderWebhooksTable();
    } catch (e) { showTableError('webhooks-tbody', 5, e.message); }
}

function renderWebhooksTable() {
    const tbody = document.getElementById('webhooks-tbody');
    const rows = state.webhooks.data;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Chưa có webhook nào</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(w => `
    <tr>
      <td>
        <span class="url-cell" title="${escHtml(w.url)}">${escHtml(w.url)}</span>
      </td>
      <td>
        <div class="events-list">
          ${(w.events || []).map(e => `<span class="event-tag">${e}</span>`).join('')}
        </div>
      </td>
      <td><span class="badge ${w.isActive ? 'badge-on' : 'badge-off'}">${w.isActive ? 'Đang hoạt động' : 'Đã tắt'}</span></td>
      <td>${renderDate(w.createdAt)}</td>
      <td>
        <button class="btn-danger" onclick="deleteWebhook('${w.id}')">Xoá</button>
      </td>
    </tr>
  `).join('');
}

function openCreateWebhookModal() { openModal('modal-create-webhook'); }

async function submitCreateWebhook() {
    const url = document.getElementById('new-webhook-url').value.trim();
    const checks = document.querySelectorAll('#modal-create-webhook .checkbox-group input[type="checkbox"]');
    const events = Array.from(checks).filter(c => c.checked).map(c => c.value);

    if (!url) { showToast('Vui lòng nhập URL.', 'error'); return; }
    if (!events.length) { showToast('Chọn ít nhất 1 sự kiện.', 'error'); return; }

    try {
        await api('POST', '/webhook', { url, events });
        closeModal('modal-create-webhook');
        showToast('Đăng ký webhook thành công!', 'success');
        fetchWebhooks();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteWebhook(id) {
    if (!confirm('Xoá webhook này?')) return;
    try {
        await api('DELETE', `/webhook/${id}`);
        showToast('Đã xoá webhook.', 'info');
        fetchWebhooks();
    } catch (e) { showToast(e.message, 'error'); }
}

/* ============================
   AUDIT LOGS
============================ */
async function fetchAuditLogs() {
    const action = document.getElementById('filter-audit-action').value;
    setLoading('audit-tbody', 5);
    try {
        const data = await api('GET', '/audit', null, {
            action,
            page: state.audit.page,
            limit: state.audit.limit,
        });
        // data.data thay vì data.logs
        state.audit.data = data?.data || data?.logs || [];
        state.audit.total = data?.total || state.audit.data.length;
        renderAuditTable();
    } catch (e) { showTableError('audit-tbody', 5, e.message); }
}

function renderAuditTable() {
    const tbody = document.getElementById('audit-tbody');
    const actionFilter = document.getElementById('filter-audit-action').value;
    let rows = state.audit.data;
    if (actionFilter) rows = rows.filter(l => l.action === actionFilter);

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Không có nhật ký</td></tr>`;
        document.getElementById('audit-pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = rows.map(log => `
    <tr>
      <td>${auditActionBadge(log.action)}</td>
      <td><span class="id-cell">${shortId(log.userId)}</span></td>
      <td>${log.jobId ? `<span class="id-cell">${shortId(log.jobId)}</span>` : '<span style="color:var(--text-muted);font-size:12px">—</span>'}</td>
      <td>${log.meta && Object.keys(log.meta).length ? renderPayloadCompact(log.meta, null, log.id + '-meta') : '<span style="color:var(--text-muted);font-size:12px">—</span>'}</td>
      <td>${renderDate(log.createdAt)}</td>
    </tr>
  `).join('');

    renderPagination('audit-pagination', state.audit.page, Math.ceil(state.audit.total / state.audit.limit), (p) => {
        state.audit.page = p; fetchAuditLogs();
    });
}

/* ============================
   RENDER HELPERS
============================ */
function statusBadge(status) {
    const map = {
        PENDING: 'badge-pending',
        ACTIVE: 'badge-active',
        COMPLETED: 'badge-completed',
        FAILED: 'badge-failed',
        CANCELLED: 'badge-cancelled',
    };
    return `<span class="badge ${map[status] || 'badge-cancelled'}">${status}</span>`;
}

function auditActionBadge(action) {
    const [domain] = action.split('.');
    const cls = { auth: 'audit-auth', job: 'audit-job', schedule: 'audit-schedule', webhook: 'audit-webhook' }[domain] || 'audit-job';
    return `<span class="audit-action ${cls}">${action}</span>`;
}

function renderPayloadCompact(payload, type, id) {
    if (!payload || typeof payload !== 'object') return `<span style="color:var(--text-muted)">—</span>`;
    const entries = Object.entries(payload);
    if (!entries.length) return `<span style="color:var(--text-muted)">{ }</span>`;

    // Show top 2 key fields as mini-grid
    const topFields = entries.slice(0, 2).map(([k, v]) => {
        const display = typeof v === 'object' ? '[Object]' : String(v);
        const short = display.length > 28 ? display.slice(0, 28) + '…' : display;
        const isUrl = typeof v === 'string' && (v.startsWith('http') || v.startsWith('https'));
        const isNum = typeof v === 'number';
        const valCls = isUrl ? 'url-val' : isNum ? 'num-val' : '';
        return `<span class="payload-key">${k}</span><span class="payload-val ${valCls}">${escHtml(short)}</span>`;
    }).join('');

    const hasMore = entries.length > 2;
    const modalBtn = `<button onclick="showPayloadModal('${id}', event)" style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;padding:1px 4px;border-radius:3px;font-weight:600">+${entries.length - 2} thêm</button>`;

    return `<div style="display:inline-grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center">
    ${topFields}
  </div>${hasMore ? '<br>' + modalBtn : ''}`;
}

const _payloadCache = {};
function showPayloadModal(id, event) {
    if (event) event.stopPropagation();
    // Find payload from all state data
    const allItems = [...state.jobs.data, ...state.schedules.data, ...state.audit.data];
    const item = allItems.find(i => i.id === id || i.id + '-meta' === id);
    if (!item) return;
    const payload = id.endsWith('-meta') ? item.meta : (item.payload || item.meta);
    document.getElementById('detail-modal-title').textContent = 'Chi tiết Payload';
    document.getElementById('detail-modal-body').innerHTML = renderPayloadTable(payload);
    openModal('modal-detail');
}

function renderPayloadTable(payload) {
    if (!payload || typeof payload !== 'object') return `<div class="detail-value mono">${escHtml(String(payload))}</div>`;
    const entries = Object.entries(payload);
    if (!entries.length) return `<div style="color:var(--text-muted);font-size:13px">Không có dữ liệu</div>`;

    const rows = entries.map(([k, v]) => {
        let displayVal = '';
        let cls = '';
        if (v === null || v === undefined) {
            displayVal = '<span style="color:var(--text-muted);font-style:italic">null</span>';
        } else if (typeof v === 'boolean') {
            displayVal = v ? '✓ true' : '✗ false';
            cls = 'is-bool';
        } else if (typeof v === 'number') {
            displayVal = v.toLocaleString('vi-VN');
            cls = 'is-num';
        } else if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
            displayVal = `<a href="${escHtml(v)}" target="_blank" title="${escHtml(v)}">${escHtml(v.length > 60 ? v.slice(0, 60) + '…' : v)}</a>`;
            cls = 'is-url';
        } else if (typeof v === 'object') {
            displayVal = `<span style="font-family:var(--font-mono);font-size:11px;background:var(--surface-2);padding:2px 6px;border-radius:3px">${escHtml(JSON.stringify(v))}</span>`;
        } else {
            displayVal = escHtml(String(v));
        }
        return `<tr><td class="pk">${escHtml(k)}</td><td class="pv ${cls}">${displayVal}</td></tr>`;
    }).join('');

    return `<table class="payload-table"><tbody>${rows}</tbody></table>`;
}

function renderDate(dt) {
    if (!dt) return '<span style="color:var(--text-muted)">—</span>';
    const d = new Date(dt);
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `<div class="date-main">${time}</div><div class="date-sub">${date}</div>`;
}

function formatDateFull(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'medium' });
}

function shortId(id) {
    if (!id) return '—';
    return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

function escHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================
   PAGINATION
============================ */
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }

    let html = `<span class="page-info">Trang ${currentPage} / ${totalPages}</span>`;
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${currentPage - 1})">‹</button>`;

    const pages = getPaginationPages(currentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="page-btn" style="border:none;cursor:default">…</span>`;
        } else {
            html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`;
        }
    });

    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${currentPage + 1})">›</button>`;
    container.innerHTML = html;
}

function getPaginationPages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

/* ============================
   MODAL HELPERS
============================ */
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

/* ============================
   TABLE UTILS
============================ */
function setLoading(tbodyId, cols) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" class="loading-cell"><div class="spinner"></div> Đang tải...</td></tr>`;
}

function showTableError(tbodyId, cols, msg) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" class="empty-cell" style="color:var(--danger)">⚠ ${escHtml(msg)}</td></tr>`;
}

/* ============================
   TOAST
============================ */
function showToast(msg, type = 'info') {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${escHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ============================
   DEMO DATA (OFFLINE MODE)
============================ */
function loadDemoData() {
    state.jobs.data = [
        {
            id: 'job-uuid-001-abc',
            type: 'RESIZE_IMAGE',
            status: 'COMPLETED',
            payload: { imageUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d', width: 300, height: 300, format: 'jpeg' },
            priority: 7, attempts: 1, maxAttempts: 3,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            startedAt: new Date(Date.now() - 3500000).toISOString(),
            completedAt: new Date(Date.now() - 3400000).toISOString(),
            result: { url: 'https://res.cloudinary.com/demo/image/upload/resized.jpg', size: '24kb' },
            error: null, userId: 'user-001',
        },
        {
            id: 'job-uuid-002-def',
            type: 'SEND_EMAIL',
            status: 'PENDING',
            payload: { to: 'nguyen.vana@gmail.com', subject: 'Chào mừng bạn!', body: 'Xin chào và chào mừng bạn đến với JobFlow.' },
            priority: 5, attempts: 0, maxAttempts: 3,
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            startedAt: null, completedAt: null, result: null, error: null, userId: 'user-001',
        },
        {
            id: 'job-uuid-003-ghi',
            type: 'SEND_SMS',
            status: 'FAILED',
            payload: { to: '+84901234567', message: 'Mã OTP của bạn là 123456, có hiệu lực trong 5 phút.' },
            priority: 9, attempts: 3, maxAttempts: 3,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            startedAt: new Date(Date.now() - 7100000).toISOString(),
            completedAt: null, result: null,
            error: 'Không thể kết nối nhà cung cấp SMS. Timeout sau 30s.',
            userId: 'user-002',
        },
        {
            id: 'job-uuid-004-jkl',
            type: 'COMPRESS_VIDEO',
            status: 'ACTIVE',
            payload: { videoUrl: 'https://storage.example.com/uploads/video_hd.mp4', quality: 75 },
            priority: 4, attempts: 1, maxAttempts: 2,
            createdAt: new Date(Date.now() - 600000).toISOString(),
            startedAt: new Date(Date.now() - 550000).toISOString(),
            completedAt: null, result: null, error: null, userId: 'user-001',
        },
        {
            id: 'job-uuid-005-mno',
            type: 'GENERATE_PDF',
            status: 'COMPLETED',
            payload: { templateId: 'invoice-v2', data: { customer: 'Công ty TNHH ABC', amount: 5000000, date: '2025-04-28' } },
            priority: 6, attempts: 1, maxAttempts: 3,
            createdAt: new Date(Date.now() - 14400000).toISOString(),
            startedAt: new Date(Date.now() - 14300000).toISOString(),
            completedAt: new Date(Date.now() - 14200000).toISOString(),
            result: { pdfUrl: 'https://files.example.com/invoice-001.pdf', pages: 2 },
            error: null, userId: 'user-003',
        },
        {
            id: 'job-uuid-006-pqr',
            type: 'EXPORT_CSV',
            status: 'CANCELLED',
            payload: { filename: 'orders_april_2025.csv', query: 'SELECT * FROM orders WHERE month=4', data: [] },
            priority: 2, attempts: 0, maxAttempts: 1,
            createdAt: new Date(Date.now() - 21600000).toISOString(),
            startedAt: null, completedAt: null, result: null, error: null, userId: 'user-002',
        },
        {
            id: 'job-uuid-007-stu',
            type: 'CALL_WEBHOOK',
            status: 'COMPLETED',
            payload: { url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX', method: 'POST', body: { text: 'Deployment thành công! 🚀' } },
            priority: 8, attempts: 1, maxAttempts: 3,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            startedAt: new Date(Date.now() - 86300000).toISOString(),
            completedAt: new Date(Date.now() - 86200000).toISOString(),
            result: { statusCode: 200, response: 'ok' },
            error: null, userId: 'user-001',
        },
    ];
    state.jobs.total = state.jobs.data.length;

    state.schedules.data = [
        {
            id: 'sch-uuid-001',
            name: 'Gửi báo cáo hàng ngày',
            jobType: 'SEND_EMAIL',
            payload: { to: 'admin@company.com', subject: 'Báo cáo ngày', body: 'Nội dung báo cáo tự động.' },
            cronExpr: '0 8 * * 1-5',
            isActive: true,
            lastRunAt: new Date(Date.now() - 86400000).toISOString(),
            nextRunAt: new Date(Date.now() + 57600000).toISOString(),
            userId: 'user-001',
            createdAt: new Date(Date.now() - 604800000).toISOString(),
        },
        {
            id: 'sch-uuid-002',
            name: 'Dọn cache mỗi giờ',
            jobType: 'CALL_WEBHOOK',
            payload: { url: 'https://api.internal.com/clear-cache', method: 'POST' },
            cronExpr: '0 * * * *',
            isActive: false,
            lastRunAt: new Date(Date.now() - 7200000).toISOString(),
            nextRunAt: null,
            userId: 'user-001',
            createdAt: new Date(Date.now() - 1209600000).toISOString(),
        },
        {
            id: 'sch-uuid-003',
            name: 'Xuất CSV đơn hàng cuối tháng',
            jobType: 'EXPORT_CSV',
            payload: { filename: 'monthly_orders.csv', data: [] },
            cronExpr: '0 9 1 * *',
            isActive: true,
            lastRunAt: null,
            nextRunAt: new Date(Date.now() + 604800000).toISOString(),
            userId: 'user-002',
            createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
    ];

    state.webhooks.data = [
        {
            id: 'wh-uuid-001',
            url: 'https://hooks.slack.com/services/T1234/B5678/abcdefgh',
            events: ['job.completed', 'job.failed'],
            isActive: true,
            userId: 'user-001',
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
        {
            id: 'wh-uuid-002',
            url: 'https://api.monitoring.io/webhook/jobflow',
            events: ['job.failed', 'job.cancelled', 'job.retried'],
            isActive: true,
            userId: 'user-001',
            createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        },
    ];

    state.audit.data = [
        { id: 'al-001', action: 'job.created', userId: 'user-uuid-001', jobId: 'job-uuid-001-abc', meta: { type: 'RESIZE_IMAGE', priority: 7 }, createdAt: new Date(Date.now() - 3700000).toISOString() },
        { id: 'al-002', action: 'job.completed', userId: 'user-uuid-001', jobId: 'job-uuid-001-abc', meta: { duration: '12s' }, createdAt: new Date(Date.now() - 3400000).toISOString() },
        { id: 'al-003', action: 'auth.login', userId: 'user-uuid-001', jobId: null, meta: { ip: '192.168.1.1', userAgent: 'Chrome/120' }, createdAt: new Date(Date.now() - 7200000).toISOString() },
        { id: 'al-004', action: 'job.failed', userId: 'user-uuid-002', jobId: 'job-uuid-003-ghi', meta: { error: 'SMS timeout', attempt: 3 }, createdAt: new Date(Date.now() - 7000000).toISOString() },
        { id: 'al-005', action: 'schedule.created', userId: 'user-uuid-001', jobId: null, meta: { name: 'Gửi báo cáo hàng ngày', cron: '0 8 * * 1-5' }, createdAt: new Date(Date.now() - 604800000).toISOString() },
        { id: 'al-006', action: 'webhook.registered', userId: 'user-uuid-001', jobId: null, meta: { url: 'https://hooks.slack.com/...', events: ['job.completed'] }, createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
        { id: 'al-007', action: 'job.cancelled', userId: 'user-uuid-002', jobId: 'job-uuid-006-pqr', meta: { reason: 'Manual cancel' }, createdAt: new Date(Date.now() - 21500000).toISOString() },
        { id: 'al-008', action: 'auth.register', userId: 'user-uuid-003', jobId: null, meta: { email: 'newuser@example.com' }, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    ];
    state.audit.total = state.audit.data.length;
}

/* ============================
   INIT
============================ */
document.addEventListener('DOMContentLoaded', () => {
    // ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
        }
    });

    // Load demo data (offline mode)
    loadDemoData();

    // Check if already logged in
    if (state.token) {
        loadUser().then(() => {
            if (state.user) {
                showApp();
            } else {
                // loadUser thất bại, token không còn hợp lệ
                handleLogout();
            }
        });
    }

    // Override fetchJobs to use demo data by default
    const origFetchJobs = fetchJobs;
    window.fetchJobs = async function () {
        if (!state.token) { renderJobsTable(); return; }
        try { await origFetchJobs(); } catch { renderJobsTable(); }
    };

    renderJobsTable();
});

/* ============================
   DEMO LOGIN (offline)
============================ */
// Override handleLogin to support demo mode
const _origHandleLogin = handleLogin;
window.handleLogin = async function () {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (email === 'demo@example.com' && password === 'demo1234') {
        state.token = 'demo-token-local';
        localStorage.setItem('access_token', 'demo-token-local');
        state.user = { email, role: 'ADMIN' };
        document.getElementById('user-email-display').textContent = email;
        document.getElementById('user-role-display').textContent = 'ADMIN';
        document.getElementById('user-avatar').textContent = 'D';
        showApp();
        // Reset về Jobs tab
        const jobsBtn = document.querySelector('.nav-item[onclick*="jobs"]');
        if (jobsBtn) switchTab('jobs', jobsBtn);
        showToast('Đăng nhập demo thành công!', 'success');
        return;
    }
    await _origHandleLogin();
};
window.handleRegister = async function () {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!email || !password || !confirm) { showFormError('reg-error', 'Vui lòng điền đầy đủ thông tin.'); return; }
    if (password.length < 8) { showFormError('reg-error', 'Mật khẩu tối thiểu 8 ký tự.'); return; }
    if (password !== confirm) { showFormError('reg-error', 'Mật khẩu xác nhận không khớp.'); return; }

    try {
        await api('POST', '/auth/register', { email, password });
        showToast('Đăng ký thành công!', 'success');
        switchPanel('login');
    } catch {
        // Demo fallback
        showToast('Đăng ký thành công! (demo mode)', 'success');
        switchPanel('login');
        document.getElementById('login-email').value = email;
    }
};