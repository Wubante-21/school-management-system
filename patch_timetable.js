const fs = require('fs');

const path = 'c:/Users/HP/Videos/sms_pro/public/js/dashboard.js';
let code = fs.readFileSync(path, 'utf8');

// Injection 1: Permissions
code = code.replace(/assignments: true,/g, "assignments: true,\n        timetable: true,");

// Injection 2: Handlers
code = code.replace("'assignments': window.loadAssignments,", "'assignments': window.loadAssignments, 'timetable': window.loadTimetable,");

// Injection 3: The loadTimetable function
const loadTimetableCode = `
window.loadTimetable = async function() {
    let timetableData = [];
    try {
        if (window.currentUser.role === 'teacher') {
            const method = window.API.teacher.timetable || window.API.teacher.getTimetable;
            const data = await method();
            timetableData = data.timetable || [];
        } else if (window.currentUser.role === 'student') {
            const method = window.API.student.timetable || window.API.student.getTimetable;
            const data = await method();
            timetableData = data.timetable || [];
        } else if (window.currentUser.role === 'parent') {
            document.getElementById('pageContent').innerHTML = \`
                <div class="alert alert-info">Please select a child to view their timetable from the My Children section.</div>
            \`;
            return;
        }

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM'];

        let tableHtml = \`
            <div class="page-title">Timetable</div>
            <p class="page-subtitle">Your weekly schedule</p>
            <div class="card mt-4">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered text-center align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th>Time</th>
                                    \${days.map(d => \`<th>\${d}</th>\`).join('')}
                                </tr>
                            </thead>
                            <tbody>
        \`;

        timeSlots.forEach(time => {
            tableHtml += \`<tr><td class="fw-bold">\${time}</td>\`;
            days.forEach(day => {
                const session = timetableData.find(t => t.day === day && t.time === time);
                if (session) {
                    tableHtml += \`
                        <td class="bg-primary text-white rounded">
                            <div class="fw-bold">\${session.subject_name || session.class_name}</div>
                            <small>\${session.room || 'TBA'}</small>
                        </td>
                    \`;
                } else {
                    tableHtml += \`<td class="text-muted">-</td>\`;
                }
            });
            tableHtml += \`</tr>\`;
        });

        tableHtml += \`
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        \`;
        document.getElementById('pageContent').innerHTML = tableHtml;
    } catch(e) {
        console.error(e);
        document.getElementById('pageContent').innerHTML = \`<div class="alert alert-info">Timetable not constructed for this user yet. Check backend API mapping.</div>\`;
    }
}
`;

code += "\n" + loadTimetableCode;

fs.writeFileSync(path, code);
