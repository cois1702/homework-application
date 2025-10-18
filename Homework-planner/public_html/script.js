// ----------------- GLOBALS -----------------
let teachers = [];
let currentTeacher = null;
let currentStudent = null;
let currentAdmin = null;
let adminUser = "admin";
let adminPass = "admin123";

// --- UTILITY: Cache Buster ---
/**
 * Appends a unique timestamp to the URL to bypass aggressive browser caching,
 * which is critical for ensuring up-to-date data fetches, especially on mobile.
 */
function cacheBusterUrl(url) {
    return `${url}?cb=${Date.now()}`;
}

// --- UTILITY: Message/Confirm Replacements (To avoid alert/confirm dialogs in embedded environments) ---
// NOTE: For production, you MUST implement a custom modal UI that sets a state
// variable instead of using this console log.
function showAppMessage(message) {
    console.log(`[APP MESSAGE] ${message}`);
    // In a real app, you would update a dedicated message box element here.
    const messageEl = document.getElementById("loginMessage") || document.getElementById("appMessageArea");
    if (messageEl) {
        messageEl.innerText = message;
        // Optionally add a timer to clear the message
        setTimeout(() => { if (messageEl.innerText === message) messageEl.innerText = ""; }, 5000);
    }
}

// NOTE: Cannot block execution like 'confirm'. This function simulates approval.
function showConfirmMessage(message, onConfirm) {
    console.warn(`[APP CONFIRM] Confirmation requested: ${message}. Automatically proceeding for demonstration.`);
    // In a real app, this would show a modal with 'Yes' and 'No' buttons.
    // For this environment, we execute the action directly or skip it.
    if (confirm(message)) { // Temporarily using confirm() until a proper modal is built in the HTML.
        onConfirm();
    }
}


window.onload = () => {
    // Populate all dropdowns
    populateDropdowns("grade", "classLetter");
    populateDropdowns("announcementGrade", "announcementClass", true);
    populateDropdowns("studentGrade", "studentClass");
    populateDropdowns("uploadGrade", "uploadClass");

    toggleLoginFields(); // Show correct login fields

    loadSchoolInfo();
    loadTeachers();
};

function populateDropdowns(gradeId, classId, includeAll = false) {
    const gradeSel = document.getElementById(gradeId);
    const classSel = document.getElementById(classId);
    if (!gradeSel || !classSel) return;

    gradeSel.innerHTML = '<option value="">Select Grade</option>';
    classSel.innerHTML = '<option value="">Select Class</option>';

    if (includeAll) {
        gradeSel.innerHTML += '<option value="all">All Grades</option>';
        classSel.innerHTML += '<option value="all">All Classes</option>';
    }

    for (let i = 1; i <= 12; i++) gradeSel.innerHTML += `<option value="${i}">Grade ${i}</option>`;
    for (let i = 65; i <= 76; i++) {
        const l = String.fromCharCode(i);
        classSel.innerHTML += `<option value="${l}">${l}</option>`;
    }
}

function toggleLoginFields() {
    const type = document.getElementById("loginType").value;
    document.getElementById("studentLoginFields").style.display = type === 'student' ? 'block' : 'none';
    document.getElementById("teacherLoginFields").style.display = type === 'teacher' ? 'block' : 'none';
    document.getElementById("adminLoginFields").style.display = type === 'admin' ? 'block' : 'none';
}

// ----------------- DATA CLEANUP LOGIC -----------------

/**
 * Automatically cleans up expired data (tasks and announcements)
 * by filtering them out and sending the cleaned array back to the server.
 */
function cleanupData(type, dateKey) {
    // Get today's date in YYYY-MM-DD format for comparison
    const today = (new Date()).toISOString().split('T')[0];

    // --- CACHE BUSTING APPLIED HERE ---
    fetch(cacheBusterUrl(`data/${type}.json`))
        .then(r => r.json())
        .catch(() => [])
        .then(data => {
            if (!Array.isArray(data)) return;

            // Filter: Keep the item if its date is today or in the future
            // The item is kept if: 1) The date field is missing (safety), OR 2) The date is greater than or equal to today
            const cleanedData = data.filter(item => {
                return !item[dateKey] || item[dateKey] >= today;
            });

            if (cleanedData.length < data.length) {
                console.log(`[CLEANUP] Deleted ${data.length - cleanedData.length} expired ${type} (${dateKey} passed).`);
                // Use saveToServer to overwrite the old file with the filtered array
                saveToServer(type, cleanedData, () => { });
            }
        });
}


// ----------------- LOGIN -----------------
function login() {
    const type = document.getElementById("loginType").value;
    document.getElementById("loginMessage").innerText = "";

    if (type === "teacher") {
        const email = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value.trim();
        const t = teachers.find(t => t.email === email && t.password === pass);
        if (!t) { document.getElementById("loginMessage").innerText = "Invalid credentials."; return; }
        currentTeacher = t;
        document.getElementById("loginView").style.display = "none";
        document.getElementById("teacherView").style.display = "block";
        document.getElementById("welcomeTeacher").innerText = `Welcome, ${t.name}`;

        // --- DATA CLEANUP: Run on every teacher login ---
        cleanupData("tasks", "due_date");
        cleanupData("announcements", "expiry_date");
        // ------------------------------------------------

        loadTeacherData();
    } else if (type === "student") {
        const grade = document.getElementById("studentGrade").value;
        const classLetter = document.getElementById("studentClass").value;
        if (!grade || !classLetter) { showAppMessage("Select grade/class."); return; }
        currentStudent = { grade, class: classLetter };
        document.getElementById("loginView").style.display = "none";
        document.getElementById("studentView").style.display = "block";
        document.getElementById("classHeader").innerText = `Viewing: Grade ${grade}${classLetter}`;

        // --- DATA CLEANUP: Run on every student login ---
        cleanupData("tasks", "due_date");
        cleanupData("announcements", "expiry_date");
        // ------------------------------------------------

        loadStudentData();
    } else if (type === "admin") {
        const user = document.getElementById("adminUsername").value.trim();
        const pass = document.getElementById("adminPassword").value.trim();
        if (user !== adminUser || pass !== adminPass) { document.getElementById("loginMessage").innerText = "Invalid admin credentials"; return; }
        currentAdmin = { user };
        document.getElementById("loginView").style.display = "none";
        document.getElementById("adminView").style.display = "block";
        loadAdminView();
    }
}

function logout() {
    currentTeacher = null; currentStudent = null; currentAdmin = null;
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    document.getElementById("loginView").style.display = "block";
}

// ----------------- TEACHER ACTIONS -----------------

function addTask() {
    const subject = document.getElementById("subject").value.trim();
    const description = document.getElementById("description").value.trim();
    const grade = document.getElementById("grade").value;
    const classLetter = document.getElementById("classLetter").value;
    const dueDate = document.getElementById("dueDate").value;
    if (!subject || !description || !grade || !classLetter || !dueDate) { showAppMessage("Fill all fields."); return; }

    const task = {
        id: Date.now(),
        subject,
        description,
        grade: grade,
        class: classLetter,
        due_date: dueDate,
        teacher: currentTeacher.name,
        created_at: (new Date()).toISOString().split('T')[0]
    };
    saveToServer("tasks", task, () => {
        showAppMessage("Task saved!");
        loadTeacherData();
    });
}

function addAnnouncement() {
    const text = document.getElementById("announcementText").value.trim();
    const grade = document.getElementById("announcementGrade").value;
    const classLetter = document.getElementById("announcementClass").value;
    // NEW: Capture the expiry date
    const expiryDate = document.getElementById("announcementExpiryDate").value;

    if (!text || !grade || !classLetter || !expiryDate) {
        showAppMessage("Fill all fields, including the expiry date.");
        return;
    }

    const ann = {
        id: Date.now(),
        text,
        grade: grade,
        class: classLetter,
        expiry_date: expiryDate, // ADDED: For auto-cleanup
        teacher: currentTeacher.name,
        created_at: (new Date()).toISOString().split('T')[0]
    };
    saveToServer("announcements", ann, () => {
        showAppMessage("Announcement saved!");
        loadTeacherData();
    });
}

// === UPLOAD FUNCTION WITH PREVIEW LOGIC (Teacher Side) ===
function uploadFile() {
    const fileInput = document.getElementById("fileUpload");
    const file = fileInput.files[0];
    const grade = document.getElementById("uploadGrade").value;
    const classLetter = document.getElementById("uploadClass").value;
    const uploadDescription = document.getElementById("uploadDescription") ? document.getElementById("uploadDescription").value.trim() : '';

    if (!file || !grade || !classLetter) return showAppMessage("Select file and grade/class");

    // --- STEP 1A: Show Pre-Upload Preview ---
    showLocalFilePreview(file);
    document.getElementById("filePreview").insertAdjacentHTML('beforeend', `<p style="color:blue;">Uploading ${file.name}...</p>`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("grade", grade);
    formData.append("class", classLetter);
    formData.append("teacher_name", currentTeacher.name);
    formData.append("description", uploadDescription);

    // --- STEP 1B: Upload the file and get the server path ---
    fetch("upload.php", { method: "POST", body: formData })
        .then(r => r.json())
        .then(result => {
            if (result.status !== 'success') {
                throw new Error(result.message || "File upload failed.");
            }

            // --- STEP 2: Save the metadata to the JSON file ---
            const uploadMetadata = {
                id: Date.now(),
                file_name: file.name,
                filepath: result.filepath,
                grade: grade,
                class: classLetter,
                teacher: currentTeacher.name,
                description: uploadDescription,
                created_at: (new Date()).toISOString().split('T')[0]
            };

            saveToServer("uploads", uploadMetadata, () => {
                showAppMessage("File uploaded and metadata saved!");

                // Show Final Uploaded File Link/Preview
                showFinalFilePreview(uploadMetadata.filepath, uploadMetadata.file_name);

                // Clear the file input and description field after successful upload
                fileInput.value = '';
                if (document.getElementById("uploadDescription")) {
                    document.getElementById("uploadDescription").value = '';
                }

                loadTeacherData(); // Refresh teacher view
            });

        })
        .catch(e => {
            console.error(e);
            document.getElementById("filePreview").innerHTML = `<p style="color:red;">Error: ${e.message || 'Failed to process upload.'}</p>`;
        });
}

// --- Helper Function for Local Preview (runs before server upload) ---
function showLocalFilePreview(file) {
    const previewContainer = document.getElementById("filePreview");
    const mimeType = file.type;

    previewContainer.innerHTML = ''; // Clear previous content

    if (mimeType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            previewContainer.innerHTML = `
                <p>Selected Image Preview:</p>
                <img src="${e.target.result}" style="max-width:150px; max-height:100px; border: 1px solid #ccc; display: block;">
            `;
        };
        reader.readAsDataURL(file);
    } else if (mimeType === 'application/pdf') {
        previewContainer.innerHTML = `
            <p>Selected PDF Preview:</p>
            <span style="font-size: 24px;">📄</span> PDF file: ${file.name}
        `;
    } else {
        previewContainer.innerHTML = `
            <p>Selected File Preview:</p>
            <span style="font-size: 24px;">📎</span> File: ${file.name}
        `;
    }
}

// --- Helper Function for Final Preview (runs after server upload) ---
function showFinalFilePreview(path, name) {
    const previewContainer = document.getElementById("filePreview");
    const extension = name.split('.').pop().toLowerCase();

    previewContainer.innerHTML = ''; // Clear temporary loading/local preview

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        previewContainer.innerHTML = `
            <p style="color:green; font-weight:bold;">Upload Successful:</p>
            <a href="${path}" target="_blank">
                <img src="${path}" style="max-width:150px; max-height:100px; border: 1px solid green;">
                <br>${name}
            </a>
        `;
    } else {
        previewContainer.innerHTML = `
            <p style="color:green; font-weight:bold;">Upload Successful:</p>
            <a href="${path}" target="_blank">Download: ${name}</a>
        `;
    }
}

// ----------------- TEACHER VIEW -----------------

function loadTeacherData() {
    if (!currentTeacher) return;
    const teacherName = currentTeacher.name;

    // --- CACHE BUSTING APPLIED TO ALL READ FETCHES IN PROMISE.ALL ---
    Promise.all([
        fetch(cacheBusterUrl("data/tasks.json")).then(r => r.json()).catch(() => []),
        fetch(cacheBusterUrl("data/announcements.json")).then(r => r.json()).catch(() => []),
        fetch(cacheBusterUrl("data/uploads.json")).then(r => r.json()).catch(() => [])
    ])
        .then(([tasks, anns, uploads]) => {
            // We filter based on currentTeacher name (not for cleanup, that runs separately)
            const fTasks = (tasks || []).filter(t => t.teacher === teacherName);
            const fAnns = (anns || []).filter(a => a.teacher === teacherName);
            const fUploads = (uploads || []).filter(u => u.teacher === teacherName);

            // Render Tasks (with Delete Button)
            const tasksHTML = fTasks.length > 0
                ? fTasks.map(t => `
                <div class="teacher-task-card">
                    <strong>${t.subject}</strong> for G${t.grade}${t.class} (Due: ${t.due_date})
                    <button class="delete-btn" onclick="showConfirmMessage('Are you sure you want to delete this task?', () => deleteItem('tasks', '${t.id}'))">Delete</button>
                    <br><small>${t.description}</small>
                </div>
            `).join("")
                : "<p>No tasks posted by you.</p>";
            document.getElementById("teacherTasksList").innerHTML = tasksHTML;

            // Render Announcements (with Delete Button)
            const annsHTML = fAnns.length > 0
                ? fAnns.map(a => `
                <div class="teacher-announcement-card">
                    ${a.text.substring(0, 50)}... for G${a.grade}${a.class} (Expires: ${a.expiry_date || 'N/A'})
                    <button class="delete-btn" onclick="showConfirmMessage('Are you sure you want to delete this announcement?', () => deleteItem('announcements', '${a.id}'))">Delete</button>
                    <br><small>Target: G${a.grade}${a.class}</small>
                </div>
            `).join("")
                : "<p>No announcements posted by you.</p>";
            document.getElementById("teacherAnnouncementsList").innerHTML = annsHTML;

            // Render Uploads (with Delete Button)
            const uploadsHTML = fUploads.length > 0
                ? fUploads.map(u => `
                <div class="teacher-upload-card">
                    <a href="${u.filepath}" target="_blank">${u.file_name}</a> for G${u.grade}${u.class}
                    <button class="delete-btn" onclick="showConfirmMessage('Are you sure you want to delete this upload? (File path: ${u.filepath})', () => deleteItem('uploads', '${u.id}', '${u.filepath}'))">Delete</button>
                    <br><small>${u.description || "No description"}</small>
                </div>
            `).join("")
                : "<p>No files uploaded by you.</p>";
            document.getElementById("teacherUploadsList").innerHTML = uploadsHTML;
        });
}

function deleteItem(type, id, filepath = null) {
    // Note: The actual confirmation logic is now inside showConfirmMessage.
    const payload = { type, id, filepath };

    fetch("delete_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(result => {
            if (result.status === 'success') {
                showAppMessage("Item deleted successfully!");
                loadTeacherData();
            } else {
                showAppMessage(`Deletion failed: ${result.message}`);
            }
        })
        .catch(e => {
            showAppMessage("Network error or server failed to process deletion.");
            console.error(e);
        });
}

// ----------------- STUDENT VIEW -----------------

// Helper function to render student uploads with previews
function renderUploads(u) {
    const fileName = u.file_name;
    const path = u.filepath;
    const extension = fileName.split('.').pop().toLowerCase();
    let previewContent = '';

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        // Render as a clickable image thumbnail
        previewContent = `
            <a href="${path}" target="_blank" title="View Full Image">
                <img src="${path}" style="max-width:100px; max-height:80px; border: 1px solid #ddd; margin-right: 10px; vertical-align: middle;">
            </a>
        `;
    } else if (extension === 'pdf') {
        // Render as a PDF icon
        previewContent = `
            <span style="font-size: 30px; color: #DC3545; margin-right: 10px; vertical-align: middle;">📄</span>
        `;
    } else if (['doc', 'docx'].includes(extension)) {
        // Render as a Word document icon
        previewContent = `
            <span style="font-size: 30px; color: #1E90FF; margin-right: 10px; vertical-align: middle;">📎</span>
        `;
    } else {
        // Default icon for other files
        previewContent = `
            <span style="font-size: 30px; color: #6C757D; margin-right: 10px; vertical-align: middle;">🔗</span>
        `;
    }

    return `
        <div class="upload-card" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            ${previewContent}
            <div>
                <strong>${u.description || fileName}</strong>
                <br><a href="${path}" target="_blank">${fileName}</a>
                <br><small>Uploaded by ${u.teacher} (${u.created_at})</small>
            </div>
        </div>
    `;
}

function loadStudentData() {
    const { grade, class: classLetter } = currentStudent;

    // --- CACHE BUSTING APPLIED TO ALL READ FETCHES IN PROMISE.ALL ---
    Promise.all([
        fetch(cacheBusterUrl("data/tasks.json")).then(r => r.json()).catch(() => []),
        fetch(cacheBusterUrl("data/announcements.json")).then(r => r.json()).catch(() => []),
        fetch(cacheBusterUrl("data/uploads.json")).then(r => r.json()).catch(() => [])
    ])
        .then(([tasks, anns, uploads]) => {
            const fTasks = (tasks || []).filter(t => t.grade == grade && t.class == classLetter);
            const fAnns = (anns || []).filter(a => a.grade === "all" || (a.grade == grade && (a.class === "all" || a.class == classLetter)));
            const fUploads = (uploads || []).filter(u => u.grade == grade && u.class == classLetter);

            document.getElementById("studentTasks").innerHTML = fTasks.length > 0 ? fTasks.map(t => `<div class="task-card"><strong>${t.subject}</strong> — ${t.description}<br>Due: ${t.due_date}<br><small>By ${t.teacher} (${t.created_at})</small></div>`).join("") : "<p>No tasks.</p>";
            document.getElementById("studentAnnouncements").innerHTML = fAnns.length > 0 ? fAnns.map(a => `<div class="announcement-card">${a.text}<br><small>By ${a.teacher} (${a.created_at})</small></div>`).join("") : "<p>No announcements.</p>";

            // Renders the uploads using the new helper function
            document.getElementById("studentUploads").innerHTML = fUploads.length > 0
                ? fUploads.map(u => renderUploads(u)).join("")
                : "<p>No uploads.</p>";
        });
}

// ----------------- ADMIN/UTILITY -----------------
function loadTeachers() {
    // --- CACHE BUSTING APPLIED HERE ---
    fetch(cacheBusterUrl("data/teachers.json")).then(r => r.json()).then(t => teachers = t).catch(() => teachers = []);
}

function loadSchoolInfo() {
    // --- CACHE BUSTING APPLIED HERE ---
    fetch(cacheBusterUrl("data/school.json")).then(r => r.json()).then(s => {
        if (s.name) document.getElementById("schoolNameHeader").innerText = s.name;
        if (s.logo) document.getElementById("schoolLogo").src = s.logo;
    }).catch(() => { });
}

function loadAdminView() {
    // --- CACHE BUSTING APPLIED HERE ---
    fetch(cacheBusterUrl("data/teachers.json")).then(r => r.json()).then(t => {
        teachers = t;
        const del = document.getElementById("deleteTeacherSelect");
        const reset = document.getElementById("resetTeacherSelect");
        del.innerHTML = ""; reset.innerHTML = "";
        teachers.forEach(x => { del.innerHTML += `<option value="${x.email}">${x.name} (${x.email})</option>`; reset.innerHTML += `<option value="${x.email}">${x.name} (${x.email})</option>`; });
    }).catch(() => { teachers = []; });

    // --- CACHE BUSTING APPLIED HERE ---
    fetch(cacheBusterUrl("data/school.json")).then(r => r.json()).then(s => {
        document.getElementById("schoolName").value = s.name || "";
        if (s.logo) document.getElementById("logoPreview").innerHTML = `<img src="${s.logo}" width="100"/>`;
    }).catch(() => { });
}

function addTeacher() {
    const name = document.getElementById("newTeacherName").value.trim();
    const email = document.getElementById("newTeacherEmail").value.trim();
    const pass = document.getElementById("newTeacherPassword").value.trim();
    if (!name || !email || !pass) { showAppMessage("Fill all fields."); return; }
    teachers.push({ name, email, password: pass });
    saveToServer("teachers", teachers, () => { showAppMessage("Teacher added!"); loadAdminView(); });
}

function deleteTeacher() {
    const email = document.getElementById("deleteTeacherSelect").value;
    showConfirmMessage("Are you sure you want to delete this teacher?", () => {
        teachers = teachers.filter(t => t.email !== email);
        saveToServer("teachers", teachers, () => { showAppMessage("Deleted!"); loadAdminView(); });
    });
}

function resetTeacherPassword() {
    const email = document.getElementById("resetTeacherSelect").value;
    const pass = document.getElementById("resetTeacherPassword").value.trim();
    if (!pass) { showAppMessage("Enter new password."); return; }
    teachers.forEach(t => { if (t.email === email) t.password = pass; });
    saveToServer("teachers", teachers, () => { showAppMessage("Password reset!"); loadAdminView(); });
}

// --- ADMIN LOGO UPLOAD (FINAL FIX - Uses new ID: schoolLogoFileInput) ---
function uploadSchoolLogo() {
    // FIX: Reference the new unique ID from the HTML
    const fileInput = document.getElementById("schoolLogoFileInput");

    // Robust check for file selection
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        document.getElementById("logoPreview").innerHTML = `<p style="color:red;">No file selected or upload cancelled.</p>`;
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // Show a quick local preview
    showLocalFilePreview(file);
    document.getElementById("logoPreview").insertAdjacentHTML('beforeend', `<p style="color:blue;">Uploading...</p>`);

    fetch("upload.php", { method: "POST", body: formData })
        .then(r => r.json())
        .then(result => {
            if (result.status === 'success') {
                // Update the logoPreview with the permanent server path
                document.getElementById("logoPreview").innerHTML = `<img src="${result.filepath}" width="100"/>`;
                showAppMessage("Logo uploaded successfully! Now click 'Save School Info' to finalize the change.");
                // Clear the file input
                fileInput.value = '';
            } else {
                showAppMessage("Logo upload failed: " + result.message);
                document.getElementById("logoPreview").innerHTML = `<p style="color:red;">Upload failed.</p>`;
            }
        })
        .catch(() => showAppMessage("Logo upload failed."));
}

function saveSchoolInfo() {
    const name = document.getElementById("schoolName").value.trim();

    // Read the 'src' attribute from the image currently displayed in the preview div.
    const logo = document.getElementById("logoPreview").querySelector("img")?.src || "";

    saveToServer("school", { name, logo }, () => {
        showAppMessage("School info saved!");
        loadSchoolInfo(); // Reloads header logo/name
    });
}

// ----------------- SAVE TO SERVER -----------------
function saveToServer(type, data, callback = () => { }) {
    // Determine if we are sending a single object (for append) or a full array (for overwrite/cleanup)
    const isArrayData = Array.isArray(data);

    // For single item addition (e.g., addTask), the server needs to know to append.
    // For cleanup/teacher management, the server needs to overwrite with the full array.
    const payload = isArrayData
        ? { type, data, action: 'overwrite' } // Explicitly tell server to overwrite the file
        : { type, data, action: 'append' }; // Explicitly tell server to append the single item

    fetch("save_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(r => {
            if (r.status === 'success') {
                callback();
            } else {
                showAppMessage(`Failed saving to server: ${r.message || 'Unknown error'}`);
                console.error(r);
            }
        })
        .catch(e => {
            showAppMessage("Failed saving to server (Network/JSON Error). Check save_data.php permissions.");
            console.error(e);
        });
}
