<?php
// Set headers for JSON response
header('Content-Type: application/json');

// Disable detailed error reporting to the client for security, but log internally (recommended in production)
// ini_set('display_errors', 0); // Your original setting
// error_reporting(E_ALL); 
// ini_set('log_errors', 1);

// Get the raw POST data (this is how the JavaScript's fetch with JSON payload works)
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Basic validation
if (!$data || !isset($data['type']) || !isset($data['data'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid input: Missing type or data payload.']);
    exit;
}

$type = $data['type'];
$payload = $data['data'];

// Determine file path for the JSON storage
$data_dir = __DIR__.'/data/';

// Ensure data directory exists
if (!file_exists($data_dir)) {
    if (!mkdir($data_dir, 0777, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to create data directory. Check permissions.']);
        exit;
    }
}

switch ($type) {
    case 'tasks': $file = $data_dir.'tasks.json'; break;
    case 'announcements': $file = $data_dir.'announcements.json'; break;
    case 'uploads': $file = $data_dir.'uploads.json'; break; // <<< ADDED UPLOADS
    case 'teachers': $file = $data_dir.'teachers.json'; break;
    case 'school': $file = $data_dir.'school.json'; break;
    default:
        echo json_encode(['status'=>'error','message'=>'Unknown data type for saving.']);
        exit;
}

// Load current data
$current = [];
if (file_exists($file)) {
    $content = file_get_contents($file);
    $current = json_decode($content, true);
    // Ensure we start with an array if the file exists but is empty/corrupted
    if (!is_array($current)) $current = [];
}

// Append or replace logic
if ($type === 'tasks' || $type === 'announcements' || $type === 'uploads') {
    // Append the new single item to the array (for tasks, announcements, uploads metadata)
    $current[] = $payload; 
} else {
    // Replace the entire content (for teachers or school info)
    $current = $payload; 
}

// Save back to file
if (file_put_contents($file, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES))) {
    echo json_encode(['status'=>'success']);
} else {
    echo json_encode(['status'=>'error','message'=>'Could not save file. Check permissions on the "data" directory.']);
}

?>