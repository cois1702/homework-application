<?php
$targetDir="uploads/";
if(!file_exists($targetDir)) mkdir($targetDir,0777,true);
if(isset($_FILES["file"])){
    $fileName=basename($_FILES["file"]["name"]);
    $targetFile=$targetDir.time().'_'.$fileName;
    if(move_uploaded_file($_FILES["file"]["tmp_name"],$targetFile)) echo $targetFile;
    else echo "Error uploading file.";
}else echo "No file uploaded.";
?>
