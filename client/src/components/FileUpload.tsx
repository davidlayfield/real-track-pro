import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, Paperclip, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type FileUploadProps = {
  projectId?: number;
  taskId?: number;
  className?: string;
};

export default function FileUpload({ projectId, taskId, className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    if (!projectId && !taskId) {
      toast({
        title: "Upload Error",
        description: "Missing project or task ID",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    if (projectId) {
      formData.append('projectId', projectId.toString());
    }
    
    if (taskId) {
      formData.append('taskId', taskId.toString());
    }

    setIsUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      setIsUploading(false);
      setSelectedFile(null);
      setProgress(0);
      
      if (xhr.status === 201) {
        toast({
          title: "File Uploaded",
          description: "Your file has been successfully uploaded",
        });
        
        // Invalidate related queries
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
        }
        
        if (taskId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/files`] });
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "There was an error uploading your file",
          variant: "destructive",
        });
      }
    });

    xhr.addEventListener('error', () => {
      setIsUploading(false);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    });

    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-neutral-400 mb-2" />
          <p className="text-sm text-neutral-600 font-medium">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Max file size: 10MB
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <File className="h-8 w-8 text-neutral-500 mr-3" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-neutral-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelUpload}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="mt-3">
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-neutral-500 mt-1">
                  Uploading... {progress}%
                </p>
              </div>
            )}

            {!isUploading && (
              <Button
                onClick={uploadFile}
                className="w-full mt-3"
                size="sm"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
