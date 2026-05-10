const fs = require('fs');

const path = 'c:/Users/HP/Videos/sms_pro/public/js/dashboard.js';
let code = fs.readFileSync(path, 'utf8');

// Improve loadTimetable to be more robust for array formats
code = code.replace(/timetableData = data\.timetable \|\| \[\];/g, "timetableData = Array.isArray(data) ? data : (data.timetable || []);");

// Inject loadMyClasses at the bottom of the file
const loadMyClassesCode = `
window.loadMyClasses = async function() {
    document.getElementById('pageContent').innerHTML = '<div class="loading-spinner"></div>';
    try {
        const data = await window.API.teacher.getClasses();
        const classes = Array.isArray(data) ? data : (data.classes || data.data || []);
        
        let html = \`
            <div class="page-title">My Classes</div>
            <p class="page-subtitle">Manage your assigned classes</p>
            <div class="row mt-4">
        \`;
        
        if (classes.length === 0) {
            html += \`<div class="col-12"><div class="alert alert-info">You are not assigned to any classes yet.</div></div>\`;
        } else {
            classes.forEach(c => {
                html += \`
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-header bg-light">
                                <h5 class="mb-0 text-primary"><i class="fas fa-school me-2"></i>\${window.escapeHtml(c.name || c.class_name || 'Class')}</h5>
                            </div>
                            <div class="card-body">
                                <p><strong>Grade:</strong> \${window.escapeHtml(c.grade || 'N/A')}</p>
                                <p><strong>Section:</strong> \${window.escapeHtml(c.section || 'N/A')}</p>
                                <p><strong>Room:</strong> \${window.escapeHtml(c.room || 'N/A')}</p>
                                <p><strong>Students:</strong> <span class="badge bg-secondary">\${c.students_count || 0}</span></p>
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-primary w-100 mb-2" onclick="window.loadAttendance()">
                                        <i class="fas fa-calendar-check me-1"></i> Mark Attendance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            });
        }
        
        html += \`</div>\`;
        document.getElementById('pageContent').innerHTML = html;
        
    } catch(e) {
        console.error('My Classes error:', e);
        document.getElementById('pageContent').innerHTML = \`<div class="alert alert-danger">Error loading classes: \${e.message}</div>\`;
    }
}
`;

if (!code.includes('window.loadMyClasses = async function()')) {
    code += "\n" + loadMyClassesCode;
}

fs.writeFileSync(path, code);
