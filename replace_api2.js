const fs = require('fs');

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    // From dashboard.js
    content = content.replace(/window\.API\.student\.notifications\(\)/g, "window.API.student.getNotifications()");
    content = content.replace(/window\.API\.teacher\.notifications\(\)/g, "window.API.teacher.getNotifications()");
    
    // Fix loadProfile wrong method for parent
    content = content.replace(/profile = await window\.API\.parent\.getDashboard\(\);/g, "profile = await window.API.parent.getProfile();");

    // From grades.js
    content = content.replace(/window\.API\.student\.grades\(\)/g, "window.API.student.getGrades()");

    fs.writeFileSync(file, content);
}

patchFile('c:/Users/HP/Videos/sms_pro/public/js/dashboard.js');
patchFile('c:/Users/HP/Videos/sms_pro/public/js/grades.js');
