import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUploadCompanies } from "@/hooks/use-companies";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const { mutate: upload, isPending, isSuccess, reset } = useUploadCompanies();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isPending || isSuccess
  });

  const handleUpload = () => {
    if (file) upload(file);
  };

  const clearFile = () => {
    setFile(null);
    reset();
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">Upload Complete!</h3>
        <p className="text-green-700 mb-6">Your company data has been successfully imported.</p>
        <Button onClick={clearFile} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
          Upload Another File
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {!file ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Drag & drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supports .xlsx, .xls, and .csv files up to 50MB
          </p>
          <Button variant="secondary" size="sm">Select File</Button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isPending && (
              <Button variant="ghost" size="icon" onClick={clearFile} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isPending && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading and processing...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="h-2 w-full animate-pulse" />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearFile} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isPending} className="min-w-[120px]">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                "Upload Data"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
