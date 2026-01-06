import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface Member {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
}

interface UploadResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
  entries: any[];
}

export default function UploadExpenses() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/payment-methods"],
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            title: "Invalid file format",
            description: "Excel file must have at least a header row and one data row",
            variant: "destructive",
          });
          return;
        }

        // Validate headers
        const headers = jsonData[0] as string[];
        const requiredHeaders = ["Date", "First Name", "Last Name", "Category", "Payment Method", "Total Amount"];
        
        // Normalize headers for comparison (trim, lowercase, normalize spaces)
        const normalizedHeaders = headers
          .filter(h => h)
          .map(h => h.toString().trim().toLowerCase().replace(/\s+/g, ' '));
        
        const normalizedRequired = requiredHeaders.map(h => h.toLowerCase());
        const missingHeaders: string[] = [];
        
        for (const reqHeader of normalizedRequired) {
          if (!normalizedHeaders.includes(reqHeader)) {
            // Find original case version
            const originalHeader = requiredHeaders[normalizedRequired.indexOf(reqHeader)];
            missingHeaders.push(originalHeader);
          }
        }

        if (missingHeaders.length > 0) {
          const foundHeaders = headers.filter(h => h && h.toString().trim()).map(h => h.toString().trim());
          toast({
            title: "Invalid file format",
            description: `Missing required columns: ${missingHeaders.join(", ")}. Found columns: ${foundHeaders.join(", ")}`,
            variant: "destructive",
          });
          return;
        }

        // Parse data rows
        const parsedData = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const rowData: any = {};
          headers.forEach((header, index) => {
            if (!header) return;
            // Normalize header: trim, lowercase, normalize spaces
            const headerLower = header.toString().trim().toLowerCase().replace(/\s+/g, ' ');
            if (headerLower === "date") rowData.date = row[index];
            else if (headerLower === "first name") rowData.firstName = row[index];
            else if (headerLower === "last name") rowData.lastName = row[index];
            else if (headerLower === "category") rowData.category = row[index];
            else if (headerLower === "payment method") rowData.paymentMethod = row[index];
            else if (headerLower === "total amount") rowData.totalAmount = row[index];
            else if (headerLower === "tax percentage") rowData.taxPercentage = row[index];
            else if (headerLower === "description") rowData.description = row[index];
          });
          parsedData.push(rowData);
        }

        setPreviewData(parsedData);
      } catch (error) {
        toast({
          title: "Error parsing file",
          description: "Failed to read Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest("POST", "/api/expense-entries/upload", formData);
      const result: UploadResult = await response.json();

      setUploadResult(result);
      
      if (result.success > 0) {
        toast({
          title: "Upload successful",
          description: `Successfully uploaded ${result.success} expense entries`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/expense-entries"] });
      }

      if (result.failed > 0 || result.errors.length > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${result.failed} entries failed. ${result.duplicates} duplicates skipped.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Date", "First Name", "Last Name", "Category", "Payment Method", "Total Amount", "Tax Percentage", "Description"],
      ["2024-01-15", "Admin", "User", "Maintenance", "Bank Transfer", "500.00", "10", "Sample expense entry"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Data");
    XLSX.writeFile(wb, "expense_template.xlsx");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Expense Data</h1>
        <p className="text-muted-foreground mt-2">
          Upload expense entries from an Excel file. Download the template below to see the required format.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Excel File Format</CardTitle>
          <CardDescription>
            Your Excel file must contain the following columns (in order):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Required Columns:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Date (YYYY-MM-DD format)</li>
                  <li>First Name (exact name from system)</li>
                  <li>Last Name (exact name from system)</li>
                  <li>Category (exact name from system)</li>
                  <li>Payment Method (exact name from system)</li>
                  <li>Total Amount (numeric)</li>
                </ul>
              </div>
              <div>
                <strong>Optional Columns:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Tax Percentage (numeric, default: 0)</li>
                  <li>Description (text)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select an Excel file to upload expense entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Select Excel File
            </Button>
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name}
              </span>
            )}
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Preview: {previewData.length} row(s) found
              </div>
              <div className="max-h-60 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.date?.toString()}</TableCell>
                        <TableCell>{row.firstName?.toString()}</TableCell>
                        <TableCell>{row.lastName?.toString()}</TableCell>
                        <TableCell>{row.category?.toString()}</TableCell>
                        <TableCell>{row.paymentMethod?.toString()}</TableCell>
                        <TableCell>{row.totalAmount?.toString()}</TableCell>
                        <TableCell>{row.taxPercentage?.toString() || "0"}</TableCell>
                        <TableCell>{row.description?.toString() || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewData.length > 5 && (
                <div className="text-sm text-muted-foreground">
                  ... and {previewData.length - 5} more row(s)
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : `Upload ${previewData.length} Entries`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {uploadResult.success}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {uploadResult.duplicates}
                </div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {uploadResult.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {uploadResult.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx} className="text-sm">{error}</li>
                    ))}
                  </ul>
                  {uploadResult.errors.length > 10 && (
                    <div className="text-sm mt-2">
                      ... and {uploadResult.errors.length - 10} more error(s)
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {uploadResult.success > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {uploadResult.success} expense entries have been successfully uploaded and are now visible in the Transactions page.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

