/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnMapping, ParsedRow } from '../bulk-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import apiRoutes from '@/apiRoutes';
import { axiosInstance } from '@/lib/utils';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PreviewStepProps {
  csvData: ParsedRow[];
  columnMappings: ColumnMapping[];
  csvColumns: string[];
}

export const PreviewStep = ({
  csvData,
  columnMappings,
}: PreviewStepProps) => {
  const { t } = useTranslation();
  const { sectionId, menuId } = useParams();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    new Set(Array.from({ length: csvData.length }, (_, i) => i))
  );
  const [displayLimit, setDisplayLimit] = useState(10);
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
//   const [uploadMessage, setUploadMessage] = useState('');

  const mappedData = useMemo(() => {
    return csvData.map((row) => {
      const mappedRow: Record<string, any> = {};
      columnMappings.forEach(({ csvColumn, menuItemField }) => {
        mappedRow[menuItemField] = row[csvColumn];
      });
      return mappedRow;
    });
  }, [csvData, columnMappings]);

  const toggleRowSelection = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === csvData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: csvData.length }, (_, i) => i)));
    }
  };

  const getFieldDisplayValue = (value: any): string => {
    if (value === null || value === undefined) return t("admin.menus.items.add.bulk.preview.empty");
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? t("admin.menus.items.add.bulk.preview.yes") : t("admin.menus.items.add.bulk.preview.no");
    if (typeof value === 'number') return value.toString();
    return JSON.stringify(value);
  };

  const displayedFields = Array.from(
    new Set(columnMappings.map((m) => m.menuItemField))
  ).sort();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {

      const response = await axiosInstance.post(apiRoutes.bulkUploadMenuItems, {
        sectionId,
        menuId,
        items: mappedData.map((item) => 
         {
          let variants = [];
          if (item?.variant_name && item?.variant_price) {
            const variantNames = item.variant_name.split(',').map((v:any) => v.trim());
            const variantPrices = item.variant_price.split(',').map((v:any) => v.trim());
            
            // Create variant objects by pairing names with prices
            variants = variantNames.map((name:any, index:number) => ({
              name: name,
              price: variantPrices[index] ? Number(variantPrices[index]) : 0
            }));
          }
           return{
          ...item,
          cookTime: item?.cookTime ? Number(item?.cookTime) : 0,
          ingredients: item?.ingredients ? item?.ingredients.split(',') : [],
          images: item?.images ? item?.images.split(',') : [],
          variants: variants,

        }}
      ),
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      console.log(err)
      toast.error(err?.response?.data?.message);
    },
  });




  const handleUpload = async () => {
    if (selectedRows.size === 0) return;
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("admin.menus.items.add.bulk.preview.totalRows")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{csvData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("admin.menus.items.add.bulk.preview.selected")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedRows.size}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("admin.menus.items.add.bulk.preview.fieldsMapped")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayedFields.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("admin.menus.items.add.bulk.preview.dataPreview")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayLimit(displayLimit === 10 ? csvData.length : 10)}
          >
            {displayLimit === 10 ? `${t("admin.menus.items.add.bulk.preview.showAll")} (${csvData.length})` : t("admin.menus.items.add.bulk.preview.showFirst10")}
          </Button>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === csvData.length}
                    // indeterminate={selectedRows.size > 0 && selectedRows.size < csvData.length}
                    onCheckedChange={toggleAllRows}
                  />
                </TableHead>
                {displayedFields.map((field) => (
                  <TableHead key={field} className="text-xs font-semibold">
                    { field}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappedData.slice(0, displayLimit).map((row, index) => (
                <TableRow key={index} className={selectedRows.has(index) ? 'bg-muted/50' : ''}>
                  <TableCell className="w-12">
                    <Checkbox
                      checked={selectedRows.has(index)}
                      onCheckedChange={() => toggleRowSelection(index)}
                    />
                  </TableCell>
                  {displayedFields.map((field) => (
                    <TableCell key={field} className="text-xs">
                      <div className="max-w-xs truncate">
                        {getFieldDisplayValue(row[field])}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {displayLimit === 10 && csvData.length > 10 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {t("admin.menus.items.add.bulk.preview.showing")} 10 {t("admin.menus.items.add.bulk.preview.rows")} {csvData.length}
          </p>
        )}
      </div>

      {/* {uploadStatus === 'idle' && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
                  Ready to Upload
                </CardTitle>
                <CardDescription className="text-blue-800 dark:text-blue-200 text-xs mt-1">
                  {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} will be uploaded with {displayedFields.length} field{displayedFields.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )} */}

      {/* {uploadStatus === 'success' && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-sm text-green-900 dark:text-green-100">
                  Upload Successful
                </CardTitle>
                <CardDescription className="text-green-800 dark:text-green-200 text-xs mt-1">
                  {uploadMessage}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {uploadStatus === 'error' && (
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-sm text-red-900 dark:text-red-100">
                  Upload Failed
                </CardTitle>
                <CardDescription className="text-red-800 dark:text-red-200 text-xs mt-1">
                  {uploadMessage}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )} */}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={isPending}
        >
          {t("admin.menus.items.add.bulk.preview.startOver")}
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedRows.size === 0 || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("admin.menus.items.add.bulk.preview.uploading")}
            </>
          ) : (
            `${t("admin.menus.items.add.bulk.preview.upload")} ${selectedRows.size > 0 ? `(${selectedRows.size})` : ''} ${t("admin.menus.items.add.bulk.preview.items")}`
          )}
        </Button>
      </div>
    </div>
  );
};
