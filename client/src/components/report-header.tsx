import { Button } from "@/components/ui/button";
import { Download, FileText, Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  filterLabel?: string;
  filterValue?: string;
  filterOptions?: { value: string; label: string }[];
  onFilterChange?: (value: string) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
}

export function ReportHeader({
  title,
  subtitle,
  filterLabel,
  filterValue,
  filterOptions,
  onFilterChange,
  onExportPDF,
  onExportExcel,
  onPrint,
}: ReportHeaderProps) {
  return (
    <div className="border-b border-border pb-8 mb-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent" data-testid="text-report-title">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterLabel && filterValue && filterOptions && onFilterChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{filterLabel}</span>
              <Select value={filterValue} onValueChange={onFilterChange}>
                <SelectTrigger className="w-40" data-testid="select-report-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF} data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
          {onExportExcel && (
            <Button variant="outline" onClick={onExportExcel} data-testid="button-export-excel">
              <FileText className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
          {onPrint && (
            <Button variant="outline" onClick={onPrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
