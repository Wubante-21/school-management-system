// Students Module - Student Page Logic
// Handles all student-related functionality

window.Students = {
    currentPage: 1,
    totalPages: 1,
    filters: {},

    // Load students page
    load: async () => {
        window.UI.showLoading('pageContent');
        try {
            const data = await window.API.admin.getStudents({ page: window.Students.currentPage, ...window.Students.filters });
            window.Students.render(data);
        } catch (error) {
            console.error('Load students error:', error);
            window.UI.showError('pageContent', 'Failed to load students: ' + error.message);
        }
    },

    // Render students page
    render: (data) => {
        const students = data.students || [];
        const pagination = data.pagination || {};
        window.Students.totalPages = pagination.totalPages || 1;

        const actionButton = window.hasPermission('canAddStudent') 
            ? '<button class="btn btn-primary" onclick="window.showAddModal(\'student\')"><i class="fas fa-plus me-2"></i>Add Student</button>'
            : '';

        document.getElementById('pageContent').innerHTML = `
            ${window.UI.renderPageHeader('Students', 'Manage student records', actionButton)}
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="Search by name, email or roll number..." id="studentSearch" value="${window.Students.filters.search || ''}" onkeyup="if(event.key==='Enter') window.Students.applyFilters()">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="studentClassFilter">
                                <option value="">All Classes</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="studentStatusFilter">
                                <option value="">All Status</option>
                                <option value="active" ${window.Students.filters.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${window.Students.filters.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-secondary w-100" onclick="window.Students.applyFilters()">Filter</button>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100" onclick="window.Students.clearFilters()">Clear</button>
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
                                    <th>Roll No</th>
                                    <th>Class</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="studentsTableBody">
                                ${window.UI.renderStudentsTable(students)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${window.UI.renderPagination(window.Students.currentPage, window.Students.totalPages, 'window.Students.goToPage')}
        `;

        window.Students.loadClassOptions();
    },

    // Load class options for filter
    loadClassOptions: async () => {
        try {
            const data = await window.API.admin.getClasses();
            const select = document.getElementById('studentClassFilter');
            if (select && data.classes) {
                data.classes.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.name;
                    if (window.Students.filters.class_id == c.id) option.selected = true;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Load classes error:', error);
        }
    },

    // Apply filters
    applyFilters: () => {
        window.Students.filters = {
            search: document.getElementById('studentSearch')?.value.trim() || '',
            class_id: document.getElementById('studentClassFilter')?.value || '',
            status: document.getElementById('studentStatusFilter')?.value || ''
        };
        window.Students.currentPage = 1;
        window.Students.load();
    },

    // Clear filters
    clearFilters: () => {
        window.Students.filters = {};
        window.Students.currentPage = 1;
        window.Students.load();
    },

    // Go to specific page
    goToPage: (page) => {
        if (page >= 1 && page <= window.Students.totalPages) {
            window.Students.currentPage = page;
            window.Students.load();
        }
    },

    // Refresh students
    refresh: () => {
        window.Students.load();
    }
};