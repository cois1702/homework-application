<?php
// ---------------------------------------------
// 1. FILE UPLOAD LOGIC
// ---------------------------------------------
$targetDir = "uploads/";
// Ensure the directory exists and is writable
if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0777, true)) {
        header('HTTP/1.1 500 Internal Server Error');
        echo "Error: Could not create upload directory.";
        exit;
    }
}

if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
    header('HTTP/1.1 400 Bad Request');
    echo "No file uploaded or an upload error occurred.";
    exit;
}

$fileName = basename($_FILES["file"]["name"]);
$targetFile = $targetDir . time() . '_' . $fileName;

// Get metadata (if you have other form fields sent along with the file)
// Note: If you have text data like 'teacher_id' or 'description', it will be in $_POST
$teacher_id = $_POST['teacher_id'] ?? 'N/A';
$description = $_POST['description'] ?? 'No Description';
// ... any other POST data (e.g., class_id)

if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetFile)) {
    // ---------------------------------------------
    // 2. JSON METADATA SAVING LOGIC
    // ---------------------------------------------
    $jsonFile = __DIR__ . '/data/uploads.json'; // Path to your uploads JSON file

    // 2a. Prepare the metadata payload
    $payload = [
        'id' => uniqid(), // Give it a unique ID
        'teacher_id' => $teacher_id,
        'description' => $description,
        'original_name' => $fileName,
        'filepath' => $targetFile, // The path students will use for download
        'upload_time' => time(),
    ];

    // 2b. Load current data
    $current = [];
    if (file_exists($jsonFile)) {
        $content = file_get_contents($jsonFile);
        $current = json_decode($content, true);
        if (!is_array($current)) $current = [];
    }

    // 2c. Append and save
    $current[] = $payload;

    if (file_put_contents($jsonFile, json_encode($current, JSON_PRETTY_PRINT))) {
        // Success response
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'filepath' => $targetFile, 'message' => 'File uploaded and metadata saved.']);
    } else {
        // Failure to save JSON - delete uploaded file to clean up
        unlink($targetFile);
        header('HTTP/1.1 500 Internal Server Error');
        echo "File uploaded, but failed to save metadata.";
    }

} else {
    // Failure to move file
    header('HTTP/1.1 500 Internal Server Error');
    echo "Error moving uploaded file to final destination.";
}
?>