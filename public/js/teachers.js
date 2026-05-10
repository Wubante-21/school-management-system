// Teachers Module - Teacher Page Logic
// Handles all teacher-related functionality

window.Teachers = {
    currentPage: 1,
    totalPages: 1,
    filters: {},

    // Load teachers page
    load: async () => {
        window.UI.showLoading('pageContent');
        try {
            const data = await window.API.admin.getTeachers({ page: window.Teachers.currentPage, ...window.Teachers.filters });
            window.Teachers.render(data);
        } catch (error) {
            console.error('Load teachers error:', error);
            window.UI.showError('pageContent', 'Failed to load teachers: ' + error.message);
        }
    },

    // Render teachers page
    render: (data) => {
        const teachers = data.teachers || [];
        const pagination = data.pagination || {};
        window.Teachers.totalPages = pagination.totalPages || 1;

        const actionButton = window.hasPermission('canAddTeacher') 
            ? '<button class="btn btn-primary" onclick="window.showAddModal(\'teacher\')"><i class="fas fa-plus me-2"></i>Add Teacher</button>'
            : '';

        document.getElementById('pageContent').innerHTML = `
            ${window.UI.renderPageHeader('Teachers', 'Manage teacher records', actionButton)}
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Search by name or email..." id="teacherSearch" value="${window.Teachers.filters.search || ''}">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="teacherStatusFilter">
                                <option value="">All Status</option>
                                <option value="active" ${window.Teachers.filters.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${window.Teachers.filters.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-secondary w-100" onclick="window.Teachers.applyFilters()">Filter</button>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100" onclick="window.Teachers.clearFilters()">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Qualification</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="teachersTableBody">
                                ${window.UI.renderTeachersTable(teachers)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${window.UI.renderPagination(window.Teachers.currentPage, window.Teachers.totalPages, 'window.Teachers.goToPage')}
        `;
    },

    // Apply filters
    applyFilters: () => {
        window.Teachers.filters = {
            search: document.getElementById('teacherSearch')?.value.trim() || '',
            status: document.getElementById('teacherStatusFilter')?.value || ''
        };
        window.Teachers.currentPage = 1;
        window.Teachers.load();
    },

    // Clear filters
    clearFilters: () => {
        window.Teachers.filters = {};
        window.Teachers.currentPage = 1;
        window.Teachers.load();
    },

    // Go to specific page
    goToPage: (page) => {
        if (page >= 1 && page <= window.Teachers.totalPages) {
            window.Teachers.currentPage = page;
            window.Teachers.load();
        }
    },

    // Refresh teachers
    refresh: () => {
        window.Teachers.load();
    }
};