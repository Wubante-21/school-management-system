// Events Module - All Event Listeners
// Centralized event handling for the application

window.Events = {
    // Initialize all event listeners
    init: () => {
        window.Events.setupSearch();
        window.Events.setupModalSubmit();
        window.Events.setupSidebar();
        window.Events.setupDropdowns();
    },

    // Search functionality
    setupSearch: () => {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        window.Events.handleSearch(query);
                    }
                }, 500);
            });
        }
    },

    // Handle search based on current section
    handleSearch: async (query) => {
        const currentSection = window.currentSection || 'students';
        try {
            let results;
            switch (currentSection) {
                case 'students':
                    results = await window.API.admin.getStudents({ search: query });
                    window.loadStudents(results.students);
                    break;
                case 'teachers':
                    results = await window.API.admin.getTeachers({ search: query });
                    window.loadTeachers(results.teachers);
                    break;
                case 'classes':
                    results = await window.API.admin.getClasses({ search: query });
                    window.loadClasses(results.classes);
                    break;
                case 'subjects':
                    results = await window.API.admin.getSubjects({ search: query });
                    window.loadSubjects(results.subjects);
                    break;
                default:
                    console.log('Search not implemented for:', currentSection);
            }
        } catch (error) {
            console.error('Search error:', error);
            window.toast('Search failed', 'error');
        }
    },

    // Modal submit handler
    setupModalSubmit: () => {
        const submitBtn = document.getElementById('modalSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const formType = submitBtn.dataset.formType;
                if (formType) {
                    window.submitForm(formType);
                }
            });
        }
    },

    // Sidebar toggle for mobile
    setupSidebar: () => {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar?.classList.toggle('active');
                overlay?.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar?.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    },

    // Dropdown handlers
    setupDropdowns: () => {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });
    },

    // Set active menu item
    setActiveMenu: (menuId) => {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-section="${menuId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    },

    // Update breadcrumb
    updateBreadcrumb: (pageName) => {
        const currentPageEl = document.getElementById('currentPage');
        if (currentPageEl) {
            currentPageEl.textContent = pageName;
        }
    },

    // Handle form submit
    handleFormSubmit: async (type, data) => {
        try {
            let response;
            switch (type) {
                case 'student':
                    response = await window.API.admin.createStudent(data);
                    break;
                case 'teacher':
                    response = await window.API.admin.createTeacher(data);
                    break;
                case 'class':
                    response = await window.API.admin.createClass(data);
                    break;
                case 'subject':
                    response = await window.API.admin.createSubject(data);
                    break;
                case 'assignment':
                    if (window.currentUser.role === 'admin') {
                        response = await window.API.admin.createAssignment(data);
                    } else {
                        response = await window.API.teacher.createAssignment(data);
                    }
                    break;
                case 'user':
                    response = await window.API.admin.createUser(data);
                    break;
                default:
                    throw new Error('Unknown form type');
            }
            window.UI.closeModal();
            window.toast(`${type} created successfully!`, 'success');
            window.loadSection(type === 'assignment' ? 'assignments' : type + 's');
            return response;
        } catch (error) {
            console.error('Form submit error:', error);
            window.toast(error.message || 'Failed to create item', 'error');
            throw error;
        }
    },

    // Handle form update
    handleFormUpdate: async (type, id, data) => {
        try {
            let response;
            switch (type) {
                case 'student':
                    response = await window.API.admin.updateStudent(id, data);
                    break;
                case 'teacher':
                    response = await window.API.admin.updateTeacher(id, data);
                    break;
                case 'class':
                    response = await window.API.admin.updateClass(id, data);
                    break;
                case 'subject':
                    response = await window.API.admin.updateSubject(id, data);
                    break;
                default:
                    throw new Error('Unknown form type');
            }
            window.UI.closeModal();
            window.toast(`${type} updated successfully!`, 'success');
            window.loadSection(type + 's');
            return response;
        } catch (error) {
            console.error('Form update error:', error);
            window.toast(error.message || 'Failed to update item', 'error');
            throw error;
        }
    },

    // Handle delete
    handleDelete: async (type, id) => {
        try {
            let response;
            switch (type) {
                case 'student':
                    response = await window.API.admin.deleteStudent(id);
                    break;
                case 'teacher':
                    response = await window.API.admin.deleteTeacher(id);
                    break;
                case 'class':
                    response = await window.API.admin.deleteClass(id);
                    break;
                case 'subject':
                    response = await window.API.admin.deleteSubject(id);
                    break;
                case 'assignment':
                    response = await window.API.teacher.deleteAssignment(id);
                    break;
                default:
                    throw new Error('Unknown delete type');
            }
            window.toast(`${type} deleted successfully!`, 'success');
            window.loadSection(type + 's');
            return response;
        } catch (error) {
            console.error('Delete error:', error);
            window.toast(error.message || 'Failed to delete item', 'error');
            throw error;
        }
    }
};