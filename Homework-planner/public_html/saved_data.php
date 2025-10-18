<?php
header('Content-Type: application/json');

// Ensure folders exist
if (!file_exists('data')) mkdir('data', 0777, true);
if (!file_exists('uploads')) mkdir('uploads', 0777, true);

// Initialize JSON files if missing
$files = ['tasks.json','announcements.json','teachers.json','school.json'];
foreach($files as $f){
    if(!file_exists("data/$f")) file_put_contents("data/$f", json_encode([]));
}

// Get POST data
$action = $_POST['action'] ?? '';

switch($action){

    // ----------------- LOGIN -----------------
    case 'login':
        $role = $_POST['role'] ?? '';
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if($role === 'admin'){
            $adminUser = 'admin';
            $adminPass = 'admin123';
            if($username === $adminUser && $password === $adminPass){
                echo json_encode(['success'=>true]);
            } else {
                echo json_encode(['success'=>false,'message'=>'Invalid admin credentials']);
            }
        } elseif($role === 'teacher'){
            $teachers = json_decode(file_get_contents('data/teachers.json'),true);
            $t = array_filter($teachers,function($x) use ($username,$password){ return $x['email']==$username && $x['password']==$password; });
            if($t){
                $t = array_values($t)[0];
                echo json_encode(['success'=>true,'name'=>$t['name']]);
            } else {
                echo json_encode(['success'=>false,'message'=>'Invalid teacher credentials']);
            }
        } else {
            echo json_encode(['success'=>false,'message'=>'Invalid role']);
        }
    break;

    // ----------------- ADD TASK -----------------
    case 'addTask':
        $tasks = json_decode(file_get_contents('data/tasks.json'),true);
        $tasks[] = [
            'subject'=>$_POST['subject'] ?? '',
            'description'=>$_POST['description'] ?? '',
            'grade'=>$_POST['grade'] ?? '',
            'class'=>$_POST['class'] ?? '',
            'due_date'=>$_POST['dueDate'] ?? '',
            'teacher'=>$_POST['teacher'] ?? '',
            'created_at'=>date('Y-m-d')
        ];
        file_put_contents('data/tasks.json',json_encode($tasks,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- ADD ANNOUNCEMENT -----------------
    case 'addAnnouncement':
        $anns = json_decode(file_get_contents('data/announcements.json'),true);
        $anns[] = [
            'text'=>$_POST['text'] ?? '',
            'grade'=>$_POST['grade'] ?? '',
            'class'=>$_POST['class'] ?? '',
            'teacher'=>$_POST['teacher'] ?? '',
            'created_at'=>date('Y-m-d')
        ];
        file_put_contents('data/announcements.json',json_encode($anns,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- ADD TEACHER -----------------
    case 'addTeacher':
        $teachers = json_decode(file_get_contents('data/teachers.json'),true);
        $teachers[] = [
            'name'=>$_POST['name'] ?? '',
            'email'=>$_POST['email'] ?? '',
            'password'=>$_POST['password'] ?? ''
        ];
        file_put_contents('data/teachers.json',json_encode($teachers,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- DELETE TEACHER -----------------
    case 'deleteTeacher':
        $email = $_POST['email'] ?? '';
        $teachers = json_decode(file_get_contents('data/teachers.json'),true);
        $teachers = array_filter($teachers,function($x) use ($email){ return $x['email'] !== $email; });
        $teachers = array_values($teachers);
        file_put_contents('data/teachers.json',json_encode($teachers,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- RESET TEACHER PASSWORD -----------------
    case 'resetTeacherPassword':
        $email = $_POST['email'] ?? '';
        $pass = $_POST['password'] ?? '';
        $teachers = json_decode(file_get_contents('data/teachers.json'),true);
        foreach($teachers as &$t){
            if($t['email']==$email) $t['password'] = $pass;
        }
        file_put_contents('data/teachers.json',json_encode($teachers,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- SAVE SCHOOL INFO -----------------
    case 'saveSchoolInfo':
        $school = [
            'name'=>$_POST['name'] ?? '',
            'logo'=>$_POST['logo'] ?? ''
        ];
        file_put_contents('data/school.json',json_encode($school,JSON_PRETTY_PRINT));
        echo json_encode(['success'=>true]);
    break;

    // ----------------- FILE UPLOAD -----------------
    default:
        if(isset($_FILES['file'])){
            $file = $_FILES['file'];
            $ext = pathinfo($file['name'],PATHINFO_EXTENSION);
            $target = 'uploads/'.time().'_'.rand(1000,9999).'.'.$ext;
            if(move_uploaded_file($file['tmp_name'],$target)){
                echo json_encode(['success'=>true,'file'=>$target]);
            } else {
                echo json_encode(['success'=>false,'message'=>'Upload failed']);
            }
        } else {
            echo json_encode(['success'=>false,'message'=>'Invalid action']);
        }
    break;
}
