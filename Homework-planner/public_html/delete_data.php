<?php
header('Content-Type: application/json');

// Get the raw POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['type']) || !isset($data['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid delete request: Missing type or ID.']);
    exit;
}

$type = $data['type'];
$id = $data['id'];
$filepath = $data['filepath'] ?? null; // Only set for uploads

$data_dir = __DIR__.'/data/';

// 1. Determine the JSON file path
switch ($type) {
    case 'tasks': $file = $data_dir.'tasks.json'; break;
    case 'announcements': $file = $data_dir.'announcements.json'; break;
    case 'uploads': $file = $data_dir.'uploads.json'; break;
    default:
        echo json_encode(['status'=>'error','message'=>'Unknown type for deletion.']);
        exit;
}

if (!file_exists($file)) {
    echo json_encode(['status' => 'error', 'message' => 'Data file not found.']);
    exit;
}

// 2. Load and Decode JSON data
$content = file_get_contents($file);
$current_data = json_decode($content, true);

if (!is_array($current_data)) {
    echo json_encode(['status' => 'error', 'message' => 'Data file content is invalid.']);
    exit;
}

// 3. Filter the array to remove the item with the matching ID
$initial_count = count($current_data);
$new_data = array_filter($current_data, function($item) use ($id) {
    // Convert ID to string for reliable comparison, as JSON may save them as strings
    return (string)($item['id'] ?? '') !== (string)$id; 
});
$final_count = count($new_data);

// Check if an item was actually removed
if ($initial_count === $final_count) {
    echo json_encode(['status' => 'error', 'message' => 'Item not found in the database.']);
    exit;
}

// 4. Handle physical file deletion for 'uploads'
if ($type === 'uploads' && $filepath) {
    // Construct the absolute path
    $absolute_filepath = __DIR__ . '/' . $filepath;
    
    // Check if the file exists and is safely located
    if (file_exists($absolute_filepath) && strpos(realpath($absolute_filepath), realpath(__DIR__ . '/uploads')) === 0) {
        if (!unlink($absolute_filepath)) {
            // Log this error, but proceed to save the JSON (optional based on preference)
            // Returning an error here might be too harsh if the file is gone but the metadata isn't.
            // For simplicity, we just log it.
            // echo json_encode(['status' => 'error', 'message' => 'Metadata deleted, but failed to delete physical file.']);
            // exit; 
        }
    }
}

// 5. Save the modified array back to the JSON file
if (file_put_contents($file, json_encode(array_values($new_data), JSON_PRETTY_PRINT))) {
    // array_values is used to re-index the array keys after filtering
    echo json_encode(['status'=>'success']);
} else {
    echo json_encode(['status'=>'error','message'=>'Could not save the updated file. Check permissions on the "data" directory.']);
}
?>