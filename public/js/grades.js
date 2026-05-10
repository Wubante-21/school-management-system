// Grades Module - Grades Page Logic
// Handles all grades-related functionality for teachers and students

window.Grades = {
    currentClassId: null,
    currentSubjectId: null,
    selectedClass: null,
    selectedSubject: null,
    
    // Add alias for window.UI
    get UI() { return window.UI; },

    // Load grades page based on role
    load: async () => {
        window.UI.showLoading('pageContent');
        try {
            if (window.currentUser.role === 'teacher') {
                await window.Grades.loadTeacherGrades();
            } else if (window.currentUser.role === 'student') {
                await window.Grades.loadStudentGrades();
            } else if (window.currentUser.role === 'admin') {
                await window.Grades.loadAdminGrades();
            } else if (window.currentUser.role === 'parent') {
                await window.Grades.loadParentGrades();
            }
        } catch (error) {
            console.error('Load grades error:', error);
            window.UI.showError('pageContent', 'Failed to load grades: ' + error.message);
        }
    },

    // Teacher: Load grades page
    loadTeacherGrades: async () => {
        const classes = await window.API.teacher.getClasses();
        
        document.getElementById('pageContent').innerHTML = `
            ${UI.renderPageHeader('Grades', 'Upload and manage student grades', '')}
            <div class="row mb-4">
                <div class="col-md-4">
                    <label class="form-label fw-semibold">Select Class</label>
                    <select class="form-select" id="gradeClassSelect" onchange="window.Grades.onClassChange()">
                        <option value="">Choose a class...</option>
                        ${(classes.classes || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.subject_name)}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-semibold">Assessment Type</label>
                    <select class="form-select" id="assessmentType">
                        <option value="Homework">Homework</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Midterm">Midterm</option>
                        <option value="Final Exam">Final Exam</option>
                        <option value="Project">Project</option>
                    </select>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                    <button class="btn btn-primary w-100" onclick="window.Grades.loadStudentsForGrading()">
                        <i class="fas fa-search me-2"></i>Load Students
                    </button>
                </div>
            </div>
            <div id="gradesTableContainer"></div>
        `;
    },

    // Teacher: Handle class selection change
    onClassChange: () => {
        const classId = document.getElementById('gradeClassSelect')?.value;
        Grades.currentClassId = classId;
        
        // Extract subject_id from the option value format "classId-subjectId"
        if (classId) {
            const selectedOption = document.querySelector(`#gradeClassSelect option[value="${classId}"]`);
            if (selectedOption) {
                // Get subject_id from the data attribute or parse from option text
                const parts = selectedOption.textContent.split(' - ');
                // We'll get subject_id from window.API response
            }
        }
        document.getElementById('gradesTableContainer').innerHTML = '';
    },

    // Teacher: Load students for grading
    loadStudentsForGrading: async () => {
        const classId = document.getElementById('gradeClassSelect')?.value;
        const assessmentType = document.getElementById('assessmentType')?.value;
        
        if (!classId) {
            window.toast('Please select a class', 'warning');
            return;
        }

        UI.showLoading('gradesTableContainer');
        
        try {
            // Get class info to find subject
            const classes = await window.API.teacher.getClasses();
            const selectedClass = classes.classes.find(c => c.id == classId);
            
            if (!selectedClass) {
                throw new Error('Class not found');
            }

            window.Grades.currentClassId = classId;
            window.Grades.currentSubjectId = selectedClass.subject_id;

            // Get students
            const students = await window.API.teacher.getClassStudents(classId);
            
            // Get existing grades
            const gradesData = await window.API.teacher.getGrades(classId, selectedClass.subject_id);
            const existingGrades = {};
            (gradesData.grades || []).forEach(g => {
                existingGrades[g.student_id + '_' + assessmentType] = g;
            });

            document.getElementById('gradesTableContainer').innerHTML = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${window.escapeHtml(selectedClass.name)} - ${window.escapeHtml(selectedClass.subject_name)}</h5>
                        <span class="badge bg-primary">${assessmentType}</span>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Student Name</th>
                                    <th>Score</th>
                                    <th>Max Score</th>
                                    <th>Grade</th>
                                    <th>Remarks</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(students.students || []).map(s => {
                                    const existing = existingGrades[s.id + '_' + assessmentType] || {};
                                    return `
                                    <tr>
                                        <td>${window.escapeHtml(s.roll_number || 'N/A')}</td>
                                        <td>${window.escapeHtml(s.name || '')}</td>
                                        <td><input type="number" class="form-control form-control-sm score-input" id="score_${s.id}" value="${existing.score || ''}" min="0" max="${existing.max_score || 100}"></td>
                                        <td><input type="number" class="form-control form-control-sm" id="maxScore_${s.id}" value="${existing.max_score || 100}" min="1"></td>
                                        <td><span class="badge bg-secondary" id="grade_${s.id}">${existing.grade || '-'}</span></td>
                                        <td><input type="text" class="form-control form-control-sm" id="remarks_${s.id}" value="${existing.remarks || ''}" placeholder="Optional"></td>
                                        <td><button class="btn btn-sm btn-primary" onclick="window.Grades.saveGrade('${s.id}', '${assessmentType}')"><i class="fas fa-save"></i></button></td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Add event listeners for score changes
            (students.students || []).forEach(s => {
                const scoreInput = document.getElementById(`score_${s.id}`);
                const maxScoreInput = document.getElementById(`maxScore_${s.id}`);
                
                if (scoreInput && maxScoreInput) {
                    scoreInput.addEventListener('input', () => Grades.calculateGrade(s.id));
                    maxScoreInput.addEventListener('input', () => Grades.calculateGrade(s.id));
                }
            });
            
        } catch (error) {
            console.error('Load students error:', error);
            document.getElementById('gradesTableContainer').innerHTML = `
                <div class="alert alert-danger">Error: ${error.message}</div>
            `;
        }
    },

    // Calculate grade based on score
    calculateGrade: (studentId) => {
        const score = parseFloat(document.getElementById(`score_${studentId}`)?.value) || 0;
        const maxScore = parseFloat(document.getElementById(`maxScore_${studentId}`)?.value) || 100;
        const percentage = (score / maxScore) * 100;
        
        let grade;
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        else grade = 'F';
        
        const gradeEl = document.getElementById(`grade_${studentId}`);
        if (gradeEl) {
            gradeEl.textContent = grade;
            gradeEl.className = `badge bg-${getGradeColor(grade)}`;
        }
    },

    // Save grade for a student
    saveGrade: async (studentId, assessmentType) => {
        const score = parseFloat(document.getElementById(`score_${studentId}`)?.value);
        const maxScore = parseFloat(document.getElementById(`maxScore_${studentId}`)?.value);
        const remarks = document.getElementById(`remarks_${studentId}`)?.value;
        
        if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
            window.toast('Please enter valid scores', 'warning');
            return;
        }
        
        if (score < 0 || score > maxScore) {
            window.toast('Score must be between 0 and max score', 'warning');
            return;
        }

        try {
            await window.API.teacher.submitGrade({
                student_id: studentId,
                subject_id: Grades.currentSubjectId,
                class_id: Grades.currentClassId,
                assessment_type: assessmentType,
                score: score,
                max_score: maxScore,
                remarks: remarks || ''
            });
            window.toast('Grade saved successfully!', 'success');
        } catch (error) {
            console.error('Save grade error:', error);
            window.toast(error.message || 'Failed to save grade', 'error');
        }
    },

    // Student: Load student grades
    loadStudentGrades: async () => {
        try {
            const data = await window.API.student.getGrades();
            const grades = data.grades || data || [];
            
            document.getElementById('pageContent').innerHTML = `
                ${UI.renderPageHeader('My Grades', 'View your grades and performance', '')}
                <div class="card">
                    <div class="card-body p-0">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Assessment</th>
                                    <th>Score</th>
                                    <th>Grade</th>
                                    <th>Percentage</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${grades.length ? grades.map(g => `
                                <tr>
                                    <td>${escapeHtml(g.subject_name || 'N/A')}</td>
                                    <td>${escapeHtml(g.assessment_type || '')}</td>
                                    <td>${g.score}/${g.max_score}</td>
                                    <td><span class="badge bg-${getGradeColor(g.grade)}">${g.grade || 'N/A'}</span></td>
                                    <td>${g.percentage ? Number(g.percentage).toFixed(1) + '%' : 'N/A'}</td>
                                    <td>${g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}</td>
                                </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4">No grades found</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Load student grades error:', error);
            UI.showError('pageContent', 'Failed to load grades: ' + error.message);
        }
    },

    // Admin: Load admin grades view
    loadAdminGrades: async () => {
        try {
            const [classes, subjects] = await Promise.all([
                window.API.admin.getClasses(),
                window.API.admin.getSubjects()
            ]);
            
            document.getElementById('pageContent').innerHTML = `
                ${UI.renderPageHeader('Grades', 'View all grades', '')}
                <div class="row mb-4">
                    <div class="col-md-4">
                        <select class="form-select" id="adminGradeClass">
                            <option value="">All Classes</option>
                            ${(classes.classes || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" id="adminGradeSubject">
                            <option value="">All Subjects</option>
                            ${(subjects.subjects || []).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-primary w-100" onclick="window.Grades.loadAdminGradesData()">View Grades</button>
                    </div>
                </div>
                <div id="adminGradesTable"></div>
            `;
        } catch (error) {
            console.error('Load admin grades error:', error);
            UI.showError('pageContent', 'Failed to load grades: ' + error.message);
        }
    },

    // Admin: Load grades data
    loadAdminGradesData: async () => {
        const classId = document.getElementById('adminGradeClass')?.value;
        const subjectId = document.getElementById('adminGradeSubject')?.value;
        
        UI.showLoading('adminGradesTable');
        
        try {
            const data = await window.API.admin.getGradesReport({ class_id: classId, subject_id: subjectId });
            const grades = data.grades || [];
            
            document.getElementById('adminGradesTable').innerHTML = `
                <div class="card">
                    <div class="card-body p-0">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Subject</th>
                                    <th>Class</th>
                                    <th>Assessment</th>
                                    <th>Score</th>
                                    <th>Grade</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${UI.renderGradesTable(grades)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Load grades data error:', error);
            document.getElementById('adminGradesTable').innerHTML = `
                <div class="alert alert-danger">Error: ${error.message}</div>
            `;
        }
    },

    // Parent: Load child grades
    loadParentGrades: async () => {
        try {
            const children = await window.API.parent.getChildren();
            
            if (!children.children || children.children.length === 0) {
                document.getElementById('pageContent').innerHTML = `
                    ${UI.renderPageHeader('Grades', 'View children grades', '')}
                    <div class="alert alert-info">No children found</div>
                `;
                return;
            }
            
            // Load grades for first child (or let parent select)
            const firstChild = children.children[0];
            const gradesData = await window.API.parent.getChildGrades(firstChild.id);
            const grades = gradesData.grades || [];
            
            document.getElementById('pageContent').innerHTML = `
                ${UI.renderPageHeader('Grades', 'View children grades', '')}
                <div class="card mb-3">
                    <div class="card-body">
                        <select class="form-select" id="childSelect" onchange="window.Grades.loadParentChildGrades()">
                            ${children.children.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body p-0">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Assessment</th>
                                    <th>Score</th>
                                    <th>Grade</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${grades.length ? grades.map(g => `
                                <tr>
                                    <td>${escapeHtml(g.subject_name || 'N/A')}</td>
                                    <td>${escapeHtml(g.assessment_type || '')}</td>
                                    <td>${g.score}/${g.max_score}</td>
                                    <td><span class="badge bg-${getGradeColor(g.grade)}">${g.grade || 'N/A'}</span></td>
                                    <td>${g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}</td>
                                </tr>`).join('') : '<tr><td colspan="5" class="text-center py-4">No grades found</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Load parent grades error:', error);
            UI.showError('pageContent', 'Failed to load grades: ' + error.message);
        }
    },

    // Parent: Load selected child's grades
    loadParentChildGrades: async () => {
        const childId = document.getElementById('childSelect')?.value;
        if (!childId) return;
        
        try {
            const data = await window.API.parent.getChildGrades(childId);
            const grades = data.grades || [];
            
            const tbody = document.querySelector('#pageContent tbody');
            if (tbody) {
                tbody.innerHTML = grades.length ? grades.map(g => `
                    <tr>
                        <td>${window.escapeHtml(g.subject_name || 'N/A')}</td>
                        <td>${window.escapeHtml(g.assessment_type || '')}</td>
                        <td>${g.score}/${g.max_score}</td>
                        <td><span class="badge bg-${window.getGradeColor(g.grade)}">${g.grade || 'N/A'}</span></td>
                        <td>${g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>`).join('') : '<tr><td colspan="5" class="text-center py-4">No grades found</td></tr>';
            }
        } catch (error) {
            console.error('Load child grades error:', error);
            window.toast('Failed to load grades', 'error');
        }
    }
};

// Make Grades globally available
window.Grades = Grades;