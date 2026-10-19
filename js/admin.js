const API_BASE = location.protocol + '//' + location.hostname + ':5000/api';

let adminToken = localStorage.getItem('admin_token') || '';
let currentAdmin = null;
let envChart = null;
let recordTypeChart = null;


async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (adminToken) {
        headers['Authorization'] = 'Bearer ' + adminToken;
    }
    
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers
        });
        return await response.json();
    } catch (e) {
        console.error('API请求失败:', e);
        return { code: -1, message: '网络错误' };
    }
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (res.code === 200) {
        if (res.data.user.role !== 'admin') {
            alert('该账号没有管理员权限');
            return;
        }
        adminToken = res.data.token;
        currentAdmin = res.data.user;
        localStorage.setItem('admin_token', adminToken);
        localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
        showAdminPanel();
    } else {
        alert(res.message || '登录失败');
    }
});

function logout() {
    adminToken = '';
    currentAdmin = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    document.getElementById('admin-layout').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
}

function showAdminPanel() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'flex';
    
    if (currentAdmin) {
        document.getElementById('admin-name').textContent = currentAdmin.real_name || currentAdmin.username;
    }
    
    switchMenu('dashboard');
}

function switchMenu(menuName) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.menu === menuName);
    });
    
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    const page = document.getElementById('page-' + menuName);
    if (page) {
        page.style.display = 'block';
    }
    
    const titles = {
        dashboard: '数据概览',
        users: '用户管理',
        farms: '农田管理',
        sensors: '设备管理',
        records: '农事记录',
        trace: '溯源管理',
        advices: '种植建议'
    };
    document.getElementById('page-title').textContent = titles[menuName] || '管理后台';
    
    if (menuName === 'dashboard') loadDashboard();
    if (menuName === 'users') loadUsers();
    if (menuName === 'farms') loadFarms();
    if (menuName === 'sensors') loadSensors();
    if (menuName === 'records') loadAllRecords();
    if (menuName === 'trace') loadTraceCodes();
    if (menuName === 'advices') loadAdvices();
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        switchMenu(this.dataset.menu);
    });
});

async function loadDashboard() {
    const res = await apiRequest('/admin/dashboard');
    if (res.code !== 200) return;
    
    const data = res.data;
    document.getElementById('stat-user-count').textContent = data.user_count;
    document.getElementById('stat-farm-count').textContent = data.farm_count;
    document.getElementById('stat-sensor-count').textContent = data.sensor_count;
    document.getElementById('stat-record-count').textContent = data.record_count;
    
    const recentUsersBody = document.getElementById('recent-users-body');
    recentUsersBody.innerHTML = data.recent_users.map(u => `
        <tr>
            <td>
                <span style="display:flex;align-items:center;gap:8px;">
                    <span>👤</span> ${u.real_name || u.username}
                </span>
            </td>
            <td>${u.phone || '-'}</td>
            <td>${u.create_time}</td>
            <td><span class="status-tag ${u.is_vip ? 'vip' : 'normal'}">${u.is_vip ? 'VIP' : '普通'}</span></td>
        </tr>
    `).join('');
    
    const recentFarmsBody = document.getElementById('recent-farms-body');
    recentFarmsBody.innerHTML = data.recent_farms.map(f => `
        <tr>
            <td>${f.name}</td>
            <td>${f.crop_type || '-'}</td>
            <td>${f.area || 0} 亩</td>
            <td>${f.create_time}</td>
        </tr>
    `).join('');
    
    loadDashboardCharts();
}

function loadDashboardCharts() {
    const envCtx = document.getElementById('envTrendChart').getContext('2d');
    if (envChart) envChart.destroy();
    
    const labels = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push((d.getMonth() + 1) + '/' + d.getDate());
    }
    
    envChart = new Chart(envCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '平均气温(°C)',
                    data: labels.map(() => (18 + Math.random() * 10).toFixed(1)),
                    borderColor: '#FF5722',
                    backgroundColor: 'rgba(255,87,34,0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '平均湿度(%)',
                    data: labels.map(() => (50 + Math.random() * 25).toFixed(1)),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33,150,243,0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '土壤湿度(%)',
                    data: labels.map(() => (45 + Math.random() * 20).toFixed(1)),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76,175,80,0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
    
    const typeCtx = document.getElementById('recordTypeChart').getContext('2d');
    if (recordTypeChart) recordTypeChart.destroy();
    
    recordTypeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: ['灌溉', '施肥', '喷药', '除草', '采收', '其他'],
            datasets: [{
                data: [25, 20, 15, 12, 8, 20],
                backgroundColor: [
                    '#2196F3',
                    '#4CAF50',
                    '#FF9800',
                    '#9C27B0',
                    '#F44336',
                    '#9E9E9E'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

async function loadUsers() {
    const res = await apiRequest('/admin/users?per_page=50');
    if (res.code !== 200) return;
    
    const tbody = document.getElementById('users-body');
    tbody.innerHTML = res.data.list.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.real_name || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.address || '-'}</td>
            <td><span class="status-tag ${u.is_vip ? 'vip' : 'normal'}">${u.is_vip ? 'VIP' : '普通'}</span></td>
            <td>${u.create_time}</td>
            <td>
                <a href="javascript:;" style="color:#4CAF50;">编辑</a>
            </td>
        </tr>
    `).join('');
}

async function loadFarms() {
    const res = await apiRequest('/admin/farms?per_page=50');
    if (res.code !== 200) return;
    
    const tbody = document.getElementById('farms-body');
    tbody.innerHTML = res.data.list.map(f => `
        <tr>
            <td>${f.id}</td>
            <td>${f.name}</td>
            <td>${f.owner_name || '-'}</td>
            <td>${f.location || '-'}</td>
            <td>${f.crop_type || '-'}</td>
            <td>${f.area || 0}</td>
            <td>${f.sensor_count || 0}</td>
            <td>${f.create_time}</td>
        </tr>
    `).join('');
}

async function loadSensors() {
    const statusFilter = document.getElementById('sensor-status-filter').value;
    const url = '/admin/sensors?per_page=50' + (statusFilter ? '&status=' + statusFilter : '');
    
    const res = await apiRequest(url);
    if (res.code !== 200) return;
    
    const tbody = document.getElementById('sensors-body');
    tbody.innerHTML = res.data.list.map(s => `
        <tr>
            <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${s.device_sn}</code></td>
            <td>${s.name || '-'}</td>
            <td>${s.farm_name || '-'}</td>
            <td>${s.sensor_type || '-'}</td>
            <td><span class="status-tag ${s.status}">${s.status === 'online' ? '在线' : '离线'}</span></td>
            <td>
                <div class="battery-bar"><div class="battery-fill" style="width:${s.battery_level}%"></div></div>
                ${s.battery_level}%
            </td>
            <td>${s.last_report_time || '-'}</td>
        </tr>
    `).join('');
}

document.getElementById('sensor-status-filter').addEventListener('change', loadSensors);

async function loadAllRecords() {
    const farmsRes = await apiRequest('/admin/farms?per_page=100');
    if (farmsRes.code !== 200) return;
    
    let allRecords = [];
    for (const farm of farmsRes.data.list) {
        try {
            const res = await apiRequest(`/farms/${farm.id}/records`);
            if (res.code === 200) {
                res.data.forEach(r => {
                    r.farm_name = farm.name;
                    allRecords.push(r);
                });
            }
        } catch (e) {}
    }
    
    allRecords.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
    
    const tbody = document.getElementById('all-records-body');
    tbody.innerHTML = allRecords.slice(0, 50).map(r => `
        <tr>
            <td>${r.id}</td>
            <td><span class="status-tag" style="background:#E8F5E9;color:#2E7D32;">${r.record_type}</span></td>
            <td>${r.title}</td>
            <td>${r.farm_name}</td>
            <td>${r.operator || '-'}</td>
            <td>${r.record_date}</td>
            <td>${r.create_time}</td>
        </tr>
    `).join('');
}

async function loadTraceCodes() {
    const farmsRes = await apiRequest('/admin/farms?per_page=100');
    if (farmsRes.code !== 200) return;
    
    let allTraces = [];
    for (const farm of farmsRes.data.list) {
        try {
            const res = await apiRequest(`/farms/${farm.id}/trace-codes`);
            if (res.code === 200) {
                res.data.forEach(t => {
                    t.farm_name = farm.name;
                    allTraces.push(t);
                });
            }
        } catch (e) {}
    }
    
    allTraces.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
    
    const tbody = document.getElementById('trace-body');
    tbody.innerHTML = allTraces.map(t => `
        <tr>
            <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${t.code}</code></td>
            <td>${t.product_name || '-'}</td>
            <td>${t.batch_no || '-'}</td>
            <td>${t.farm_name}</td>
            <td>${t.harvest_date || '-'}</td>
            <td>${t.scan_count}</td>
            <td><span class="status-tag ${t.status === 'active' ? 'online' : 'offline'}">${t.status === 'active' ? '有效' : '已失效'}</span></td>
        </tr>
    `).join('');
}

async function loadAdvices() {
    const res = await apiRequest('/planting-advices');
    if (res.code !== 200) return;
    
    const tbody = document.getElementById('advices-body');
    tbody.innerHTML = res.data.map(a => `
        <tr>
            <td>${a.id}</td>
            <td>${a.crop_type}</td>
            <td>${a.growth_stage}</td>
            <td><span class="status-tag" style="background:#E3F2FD;color:#1565C0;">${a.advice_type || '建议'}</span></td>
            <td>${a.title}</td>
            <td>
                <a href="javascript:;" style="color:#4CAF50;margin-right:10px;">编辑</a>
                <a href="javascript:;" style="color:#F44336;">删除</a>
            </td>
        </tr>
    `).join('');
}

function init() {
    const saved = localStorage.getItem('admin_user');
    if (saved && adminToken) {
        currentAdmin = JSON.parse(saved);
        showAdminPanel();
    }
}

init();
